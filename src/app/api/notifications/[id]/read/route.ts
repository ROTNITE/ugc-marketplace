import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireUser();
    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, isRead: true },
    });

    if (!notification) return fail(404, API_ERROR_CODES.NOT_FOUND, "Уведомление не найдено.", requestId);
    if (notification.userId !== user.id) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Уведомление не найдено.", requestId);
    }

    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true },
      });
    }

    return ok({ read: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/notifications/[id]/read failed", error, requestId, {
      notificationId: params.id,
    });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось обновить уведомление.", requestId);
  }
}
