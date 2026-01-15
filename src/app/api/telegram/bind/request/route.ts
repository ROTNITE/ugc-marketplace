import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { generateBindingCode, hashBindingCode } from "@/lib/telegram/binding";
import { logApiError } from "@/lib/request-id";

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_MAX_PER_WINDOW = 3;

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();

    const limiter = rateLimit(`tg-bind-request:${user.id}`, {
      windowMs: REQUEST_WINDOW_MS,
      max: REQUEST_MAX_PER_WINDOW,
    });

    if (!limiter.allowed) {
      return fail(
        429,
        API_ERROR_CODES.RATE_LIMITED,
        "Слишком много запросов. Попробуйте позже.",
        requestId,
        { retryAfterSec: limiter.retryAfterSec },
      );
    }

    const existing = await prisma.telegramAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existing) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Telegram уже привязан. Сначала отвяжите текущую привязку.",
        requestId,
        { code: "ALREADY_BOUND" },
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const code = generateBindingCode();
    const codeHash = hashBindingCode(code);

    await prisma.$transaction(async (tx) => {
      await tx.telegramBindingRequest.updateMany({
        where: { userId: user.id, status: "PENDING", expiresAt: { gt: now } },
        data: { status: "EXPIRED" },
      });
      await tx.telegramBindingRequest.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt,
          status: "PENDING",
          attempts: 0,
        },
      });
    });

    return ok({ code, expiresAt }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/telegram/bind/request failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось создать код.", requestId);
  }
}
