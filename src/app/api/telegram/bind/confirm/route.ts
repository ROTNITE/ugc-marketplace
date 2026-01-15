import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { hashBindingCode, normalizeBindingCode } from "@/lib/telegram/binding";
import { logApiError } from "@/lib/request-id";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson } from "@/lib/api/contract";
import { rateLimit } from "@/lib/api/rate-limit";

const schema = z.object({
  code: z.string().min(4).max(32),
  telegramUserId: z.string().min(3).max(64),
  telegramUsername: z.string().min(1).max(64).optional(),
});

const MAX_ATTEMPTS = 5;

function getBotSecret() {
  return (
    process.env.TELEGRAM_BOT_SECRET ||
    process.env.TELEGRAM_BINDING_SECRET ||
    process.env.OUTBOX_CONSUMER_SECRET ||
    ""
  );
}

function requireAuth(req: Request) {
  const header = req.headers.get("authorization");
  const bearerToken = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const secretHeader = req.headers.get("x-telegram-bot-secret");
  const token = secretHeader || bearerToken;
  if (!token) return false;
  const secret = getBotSecret();
  if (!secret) return false;
  return token === secret;
}

function getClientKey(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  if (!requireAuth(req)) {
    return fail(401, API_ERROR_CODES.OUTBOX_AUTH_ERROR, "Недостаточно прав.", requestId);
  }

  const limiter = rateLimit(`tg-bind-confirm:${getClientKey(req)}`, {
    windowMs: 60_000,
    max: 30,
  });

  if (!limiter.allowed) {
    return fail(429, API_ERROR_CODES.RATE_LIMITED, "Слишком много попыток. Повторите позже.", requestId, {
      retryAfterSec: limiter.retryAfterSec,
    });
  }

  const parsed = await parseJson(req, schema, requestId);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  const now = new Date();
  const code = normalizeBindingCode(parsed.data.code);
  const codeHash = hashBindingCode(code);
  const telegramUserId = parsed.data.telegramUserId.trim();
  const telegramUsername = parsed.data.telegramUsername?.trim() || null;

  const request = await prisma.telegramBindingRequest.findFirst({
    where: { codeHash, status: "PENDING", expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  if (!request) {
    await prisma.telegramBindingRequest.updateMany({
      where: { codeHash, status: "PENDING", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Неверный код или срок действия истёк.", requestId, {
      code: "INVALID_CODE",
    });
  }

  try {
    const account = await prisma.$transaction(async (tx) => {
      if (request.attempts >= MAX_ATTEMPTS) {
        await tx.telegramBindingRequest.update({
          where: { id: request.id },
          data: { status: "EXPIRED" },
        });
        throw new Error("TOO_MANY_ATTEMPTS");
      }

      await tx.telegramBindingRequest.update({
        where: { id: request.id },
        data: { attempts: { increment: 1 } },
      });

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
        data: { usedAt: now, status: "USED" },
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
    if (error instanceof Error && error.message === "TOO_MANY_ATTEMPTS") {
      return fail(
        429,
        API_ERROR_CODES.RATE_LIMITED,
        "Слишком много попыток. Сгенерируйте новый код.",
        requestId,
        { code: "TOO_MANY_ATTEMPTS" },
      );
    }
    if (error instanceof Error && error.message === "TELEGRAM_ALREADY_BOUND") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Telegram уже привязан к другому аккаунту.", requestId, {
        code: "TELEGRAM_ALREADY_BOUND",
      });
    }
    logApiError("[api] telegram:bind confirm failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось подтвердить привязку.", requestId);
  }
}
