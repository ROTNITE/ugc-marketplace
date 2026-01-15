import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Причина должна быть не короче 10 символов")
    .max(1000, "Причина слишком длинная"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
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

    const parsed = await parseJson(req, rejectSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;
    const reason = parsed.data.reason;

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        moderationStatus: "REJECTED",
        moderationReason: reason,
        moderatedAt: new Date(),
        moderatedByUserId: moderator ? user.id : null,
      },
    });

    await createNotification(job.brandId, {
      type: "MODERATION_REJECTED",
      title: "Заказ отклонён модерацией",
      body: reason ? `${job.title}\nПричина: ${reason}` : job.title,
      href: `/dashboard/jobs/${job.id}`,
    });

    await emitEvent("JOB_MODERATION_REJECTED", {
      jobId: job.id,
      brandId: job.brandId,
      reason,
      moderatedBy: user.id,
    }).catch(() => {});

    return ok({ job: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/jobs/[id]/reject failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отклонить заказ.", requestId);
  }
}
