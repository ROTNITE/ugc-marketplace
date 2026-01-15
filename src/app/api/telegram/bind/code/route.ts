import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { generateBindingCode, hashBindingCode } from "@/lib/telegram/binding";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
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
        where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      await tx.telegramBindingRequest.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt,
        },
      });
    });

    return ok({ code, expiresAt }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/telegram/bind/code failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось создать код.", requestId);
  }
}
