import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { notifyMatchingAlerts } from "@/lib/jobs/alerts";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("ADMIN");
    const moderator = await prisma.user.findUnique({ where: { id: user.id } });

    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    if (job.moderationStatus !== "PENDING") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Статус модерации уже изменен.", requestId, {
        code: "STATUS_NOT_PENDING",
      });
    }

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        moderationStatus: "APPROVED",
        moderationReason: null,
        moderatedAt: new Date(),
        moderatedByUserId: moderator ? user.id : null,
      },
    });

    await createNotification(job.brandId, {
      type: "MODERATION_APPROVED",
      title: "Заказ одобрен модерацией",
      body: job.title,
      href: `/dashboard/jobs/${job.id}`,
    });

    await emitEvent("JOB_MODERATION_APPROVED", {
      jobId: job.id,
      brandId: job.brandId,
      moderatedBy: user.id,
    }).catch(() => {});

    if (updated.status === "PUBLISHED") {
      await notifyMatchingAlerts(updated.id);
    }

    return ok({ job: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/jobs/[id]/approve failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось одобрить заказ.", requestId);
  }
}
