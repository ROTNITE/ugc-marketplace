import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isCreatorOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);

  try {
    const user = await requireRole("CREATOR");
    const application = await prisma.application.findUnique({ where: { id: params.id } });
    if (!application) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Отклик не найден.", requestId);
    }
    if (!isCreatorOwner(user, application.creatorId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Отклик не найден.", requestId);
    }
    if (application.status !== "PENDING") {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Отклик уже обработан и не может быть отозван.",
        requestId,
        { code: "APPLICATION_NOT_PENDING" },
      );
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "WITHDRAWN" },
    });

    return ok({ application: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/applications/[id]/withdraw failed", error, requestId, {
      applicationId: params.id,
    });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отозвать отклик.", requestId);
  }
}
