import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    const existing = await prisma.telegramAccount.findUnique({
      where: { userId: user.id },
      select: { telegramUserId: true },
    });

    if (!existing) {
      return ok({ unbound: false }, requestId);
    }

    await prisma.telegramAccount.delete({ where: { userId: user.id } });

    await createNotification(user.id, {
      type: "TELEGRAM_UNBOUND",
      title: "Telegram отвязан",
      body: "Привязка Telegram удалена.",
      href: "/dashboard/profile",
    });

    await emitEvent("TELEGRAM_UNBOUND", { userId: user.id, telegramUserId: existing.telegramUserId }).catch(() => {});

    return ok({ unbound: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/telegram/bind/unlink failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отвязать Telegram.", requestId);
  }
}
