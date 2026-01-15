import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { hashBindingCode, normalizeBindingCode } from "@/lib/telegram/binding";

const schema = z.object({
  code: z.string().min(4).max(32),
  telegramUserId: z.string().min(3).max(64),
  telegramUsername: z.string().min(1).max(64).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function requireAuth(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const secret = process.env.TELEGRAM_BINDING_SECRET || process.env.OUTBOX_CONSUMER_SECRET;
  if (!secret) return false;
  return token === secret;
}

export async function POST(req: Request) {
  if (!requireAuth(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const code = normalizeBindingCode(parsed.data.code);
  const codeHash = hashBindingCode(code);
  const telegramUserId = parsed.data.telegramUserId.trim();
  const telegramUsername = parsed.data.telegramUsername?.trim() || null;

  const request = await prisma.telegramBindingRequest.findFirst({
    where: { codeHash, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  if (!request) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  try {
    const account = await prisma.$transaction(async (tx) => {
      const existingByTelegram = await tx.telegramAccount.findUnique({
        where: { telegramUserId },
        select: { userId: true },
      });

      if (existingByTelegram && existingByTelegram.userId !== request.userId) {
        throw new Error("TELEGRAM_ALREADY_BOUND");
      }

      const account = await tx.telegramAccount.upsert({
        where: { userId: request.userId },
        update: { telegramUserId, telegramUsername },
        create: { userId: request.userId, telegramUserId, telegramUsername },
      });

      await tx.telegramBindingRequest.update({
        where: { id: request.id },
        data: { usedAt: now },
      });

      return account;
    });

    await createNotification(account.userId, {
      type: "TELEGRAM_BOUND",
      title: "Telegram привязан",
      body: telegramUsername ? `@${telegramUsername}` : "Аккаунт успешно привязан.",
      href: "/dashboard/profile",
    });

    await emitEvent("TELEGRAM_BOUND", {
      userId: account.userId,
      telegramUserId: account.telegramUserId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, userId: account.userId });
  } catch (error) {
    if (error instanceof Error && error.message === "TELEGRAM_ALREADY_BOUND") {
      return NextResponse.json({ error: "TELEGRAM_ALREADY_BOUND" }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
