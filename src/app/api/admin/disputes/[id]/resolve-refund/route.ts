import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { refundEscrowForJob } from "@/lib/payments/escrow";
import { logApiError } from "@/lib/request-id";

const bodySchema = z.object({
  note: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("ADMIN");
    const parsed = await parseJson(req, bodySchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({
        where: { id: params.id },
        include: { job: { include: { escrow: true } } },
      });

      if (!dispute) return { error: "NOT_FOUND" as const };
      if (dispute.status === "RESOLVED") return { ok: true, alreadyResolved: true, dispute };
      if (dispute.status !== "OPEN") return { error: "STATUS_NOT_OPEN" as const };

      const job = dispute.job;
      if (!job) return { error: "JOB_NOT_FOUND" as const };

      const refund = await refundEscrowForJob({
        jobId: job.id,
        actorUserId: user.id,
        reason: parsed.data.note?.trim() || null,
        source: "DISPUTE",
        tx,
      });

      if (refund.status === "released") return { error: "ESCROW_ALREADY_RELEASED" as const };
      if (refund.status === "job_not_found") return { error: "JOB_NOT_FOUND" as const };

      await tx.job.update({
        where: { id: job.id },
        data: { status: "CANCELED", cancelReason: parsed.data.note?.trim() || "Спор решён: возврат" },
      });

      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED",
          resolution: "REFUND",
          resolvedAt: new Date(),
          resolvedByUserId: user.id,
          adminNote: parsed.data.note?.trim() || null,
        },
      });

      const refunded = refund.status === "refunded" || refund.status === "already_refunded";
      const escrowId = "escrowId" in refund ? refund.escrowId : null;
      return { ok: true, dispute: updatedDispute, refunded, escrowId, job };
    });

    if (result.error === "NOT_FOUND") {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Спор не найден.", requestId);
    }
    if (result.error === "STATUS_NOT_OPEN") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Статус спора не открыт.", requestId, {
        code: "STATUS_NOT_OPEN",
      });
    }
    if (result.error === "ESCROW_ALREADY_RELEASED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя вернуть после выплаты.", requestId, {
        code: "ESCROW_ALREADY_RELEASED",
      });
    }
    if (result.error === "JOB_NOT_FOUND") {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    if ("alreadyResolved" in result && result.alreadyResolved) {
      return ok({ alreadyResolved: true }, requestId);
    }

    if ("job" in result && result.job) {
      const job = result.job;
      await createNotification(job.brandId, {
        type: "DISPUTE_RESOLVED_REFUND",
        title: "Спор решён: возврат",
        body: job.title,
        href: `/dashboard/jobs/${job.id}`,
      });
      if (job.activeCreatorId) {
        await createNotification(job.activeCreatorId, {
          type: "DISPUTE_RESOLVED_REFUND",
          title: "Спор решён: возврат",
          body: job.title,
          href: `/dashboard/work/${job.id}`,
        });
      }

      await emitEvent("DISPUTE_RESOLVED_REFUND", {
        jobId: job.id,
        disputeId: result.dispute.id,
        escrowId: result.escrowId,
        refunded: result.refunded,
        resolvedBy: user.id,
      }).catch(() => {});
    }

    const refunded = "refunded" in result ? result.refunded : false;
    return ok({ refunded }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/disputes/[id]/resolve-refund failed", error, requestId, {
      disputeId: params.id,
    });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось решить спор.", requestId);
  }
}
