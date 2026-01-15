import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { markAllRead } from "@/lib/notifications";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    await markAllRead(user.id);
    return ok({ readAll: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/notifications/read-all failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось обновить уведомления.", requestId);
  }
}
