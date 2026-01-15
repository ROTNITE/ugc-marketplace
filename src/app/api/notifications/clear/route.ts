import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    return ok({ cleared: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/notifications/clear failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось очистить уведомления.", requestId);
  }
}
