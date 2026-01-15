import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("BRAND");
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, brandId: true, status: true, activeCreatorId: true },
    });

    if (!job || !isBrandOwner(user, job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }
    if (job.activeCreatorId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя ставить на паузу при выбранном креаторе.", requestId, {
        code: "HAS_CREATOR",
      });
    }
    if (job.status !== "PUBLISHED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Можно приостановить только опубликованный заказ.", requestId, {
        code: "ONLY_PUBLISHED",
      });
    }

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { status: "PAUSED" },
    });

    return ok({ job: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/pause failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось приостановить заказ.", requestId);
  }
}
