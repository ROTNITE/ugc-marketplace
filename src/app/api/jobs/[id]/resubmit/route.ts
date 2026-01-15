import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { isBrandOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireUser();
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        brandId: true,
        title: true,
        moderationStatus: true,
      },
    });

    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    const isOwner = user.role === "BRAND" && isBrandOwner(user, job.brandId);
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    if (job.moderationStatus === "APPROVED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заказ уже одобрен.", requestId, {
        code: "ALREADY_APPROVED",
      });
    }

    if (job.moderationStatus === "PENDING") {
      return ok({ job }, requestId);
    }

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        moderationStatus: "PENDING",
        moderationReason: null,
        moderatedAt: null,
        moderatedByUserId: null,
      },
    });

    await createNotification(job.brandId, {
      type: "MODERATION_RESUBMITTED",
      title: "Заказ отправлен на повторную модерацию",
      body: updated.title,
      href: `/dashboard/jobs/${updated.id}`,
    });

    await emitEvent("JOB_MODERATION_RESUBMITTED", {
      jobId: updated.id,
      brandId: updated.brandId,
      byUserId: user.id,
    }).catch(() => {});

    return ok({ job: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/resubmit failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отправить на модерацию.", requestId);
  }
}
