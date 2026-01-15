import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { refundEscrowForJob } from "@/lib/payments/escrow";
import { isBrandOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

const schema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;
    const reason = parsed.data.reason?.trim() || null;

    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        brandId: true,
        status: true,
        activeCreatorId: true,
        moderationStatus: true,
        title: true,
        cancelReason: true,
        escrow: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            currency: true,
          },
        },
      },
    });

    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    const isOwner = user.role === "BRAND" && isBrandOwner(user, job.brandId);
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    const dispute = await prisma.dispute.findUnique({
      where: { jobId: job.id },
      select: { status: true },
    });
    if (dispute?.status === "OPEN" && !isAdmin) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Идёт спор. Отмена возможна только админом.", requestId, {
        code: "DISPUTE_OPEN",
      });
    }

    if (job.status === "COMPLETED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя отменить завершенный заказ.", requestId, {
        code: "CANNOT_CANCEL_COMPLETED",
      });
    }

    if (job.status === "IN_REVIEW" && !isAdmin) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Отменить заказ на модерации может только админ.",
        requestId,
        { code: "ONLY_ADMIN_CAN_CANCEL_ON_REVIEW" },
      );
    }

    if (job.status === "CANCELED") {
      return ok({ alreadyCanceled: true }, requestId);
    }

    if (job.escrow?.status === "RELEASED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя вернуть после выплаты.", requestId, {
        code: "ESCROW_ALREADY_RELEASED",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: job.id },
        data: { status: "CANCELED", cancelReason: reason },
      });

      return refundEscrowForJob({
        jobId: job.id,
        actorUserId: user.id,
        reason,
        source: "CANCEL",
        tx,
      });
    });

    const refunded = result.status === "refunded" || result.status === "already_refunded";

    await createNotification(job.brandId, {
      type: "JOB_CANCELED",
      title: refunded ? "Сделка отменена, эскроу возвращен" : "Сделка отменена",
      body: job.title,
      href: `/dashboard/jobs/${job.id}`,
    });

    if (job.activeCreatorId) {
      await createNotification(job.activeCreatorId, {
        type: "JOB_CANCELED",
        title: "Сделка отменена",
        body: job.title,
        href: `/dashboard/work/${job.id}`,
      });
    }

    return ok({ refunded }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/cancel failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отменить сделку.", requestId);
  }
}
