import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("CREATOR");
    if (!user.creatorProfileId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль креатора.", requestId, {
        code: "CREATOR_PROFILE_REQUIRED",
      });
    }

    const alert = await prisma.savedJobAlert.findUnique({
      where: { id: params.id },
      select: { id: true, creatorProfileId: true },
    });

    if (!alert || alert.creatorProfileId !== user.creatorProfileId) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Алерт не найден.", requestId);
    }

    await prisma.savedJobAlert.delete({ where: { id: alert.id } });

    return ok({ deleted: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("DELETE /api/alerts/[id] failed", error, requestId, { alertId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось удалить алерт.", requestId);
  }
}
