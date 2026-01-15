import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";
import { createNotification } from "@/lib/notifications";
import { logApiError } from "@/lib/request-id";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; applicationId: string } },
) {
  const requestId = ensureRequestId(_req);

  try {
    const user = await requireRole("BRAND");
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, brandId: true, title: true },
    });

    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    if (!isBrandOwner(user, job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
      select: { id: true, jobId: true, status: true, creatorId: true },
    });

    if (!application || application.jobId !== job.id) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Отклик не найден.", requestId);
    }

    if (application.status !== "PENDING") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Отклик уже обработан.", requestId, {
        code: "APPLICATION_NOT_PENDING",
      });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "REJECTED" },
    });

    await createNotification(application.creatorId, {
      type: "APPLICATION_REJECTED",
      title: "Отклик отклонён",
      body: job.title,
      href: "/dashboard/applications",
    });

    return ok({ application: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/applications/[applicationId]/reject failed", error, requestId, {
      jobId: params.id,
      applicationId: params.applicationId,
    });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отклонить отклик.", requestId);
  }
}
