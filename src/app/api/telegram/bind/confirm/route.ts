import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { hashBindingCode, normalizeBindingCode } from "@/lib/telegram/binding";
import { logApiError } from "@/lib/request-id";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson } from "@/lib/api/contract";

const schema = z.object({
  code: z.string().min(4).max(32),
  telegramUserId: z.string().min(3).max(64),
  telegramUsername: z.string().min(1).max(64).optional(),
});

function requireAuth(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const secret = process.env.TELEGRAM_BINDING_SECRET || process.env.OUTBOX_CONSUMER_SECRET;
  if (!secret) return false;
  return token === secret;
}

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  if (!requireAuth(req)) {
    return fail(401, API_ERROR_CODES.OUTBOX_AUTH_ERROR, "Недостаточно прав.", requestId);
  }

  const parsed = await parseJson(req, schema, requestId);
  if ("errorResponse" in parsed) return parsed.errorResponse;

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
    return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Неверный код.", requestId, {
      code: "INVALID_CODE",
    });
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

    return ok({ userId: account.userId }, requestId);
  } catch (error) {
    if (error instanceof Error && error.message === "TELEGRAM_ALREADY_BOUND") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Telegram уже привязан к другому аккаунту.", requestId, {
        code: "TELEGRAM_ALREADY_BOUND",
      });
    }
    logApiError("[api] telegram:bind confirm failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось подтвердить привязку.", requestId);
  }
}
