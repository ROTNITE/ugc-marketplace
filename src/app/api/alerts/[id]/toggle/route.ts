import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";

const schema = z.object({
  isActive: z.boolean(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("CREATOR");
    if (!user.creatorProfileId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль креатора.", requestId, {
        code: "CREATOR_PROFILE_REQUIRED",
      });
    }

    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const alert = await prisma.savedJobAlert.findUnique({
      where: { id: params.id },
      select: { id: true, creatorProfileId: true },
    });

    if (!alert || alert.creatorProfileId !== user.creatorProfileId) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Алерт не найден.", requestId);
    }

    const updated = await prisma.savedJobAlert.update({
      where: { id: alert.id },
      data: { isActive: parsed.data.isActive },
    });

    return ok({ alert: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/alerts/[id]/toggle failed", error, requestId, { alertId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось обновить алерт.", requestId);
  }
}
