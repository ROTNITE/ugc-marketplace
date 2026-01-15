import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { releaseEscrowForJob } from "@/lib/payments/escrow";
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
      if (!job.activeCreatorId) return { error: "NO_ACTIVE_CREATOR" as const };

      const release = await releaseEscrowForJob({ jobId: job.id, actorUserId: user.id, source: "DISPUTE", tx });

      if (release.status === "job_not_found") return { error: "JOB_NOT_FOUND" as const };
      if (release.status === "missing") return { error: "ESCROW_MISSING" as const };
      if (release.status === "refunded") return { error: "ESCROW_REFUNDED" as const };
      if (release.status === "unfunded") return { error: "ESCROW_UNFUNDED" as const };
      if (release.status === "no_active_creator") return { error: "NO_ACTIVE_CREATOR" as const };

      if (release.status === "already_released") {
        const resolved = await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: "RESOLVED",
            resolution: "RELEASE",
            resolvedAt: new Date(),
            resolvedByUserId: user.id,
            adminNote: parsed.data.note?.trim() || null,
          },
        });
        return { ok: true, alreadyReleased: true, dispute: resolved, job };
      }

      const lastSubmission = await tx.submission.findFirst({
        where: { jobId: job.id },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      if (lastSubmission) {
        await tx.submission.update({
          where: { id: lastSubmission.id },
          data: { status: "APPROVED" },
        });
      }

      await tx.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED" },
      });

      const updatedDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED",
          resolution: "RELEASE",
          resolvedAt: new Date(),
          resolvedByUserId: user.id,
          adminNote: parsed.data.note?.trim() || null,
        },
      });

      return {
        ok: true,
        dispute: updatedDispute,
        job,
        payoutCents: release.payoutCents,
        payoutCurrency: release.payoutCurrency,
        commissionCents: release.commissionCents,
      };
    });

    if (result.error === "NOT_FOUND") {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Спор не найден.", requestId);
    }
    if (result.error === "STATUS_NOT_OPEN") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Статус спора не открыт.", requestId, {
        code: "STATUS_NOT_OPEN",
      });
    }
    if (result.error === "JOB_NOT_FOUND") {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }
    if (result.error === "ESCROW_MISSING") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Эскроу не найден.", requestId, {
        code: "ESCROW_MISSING",
      });
    }
    if (result.error === "ESCROW_REFUNDED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Эскроу уже возвращён.", requestId, {
        code: "ESCROW_REFUNDED",
      });
    }
    if (result.error === "ESCROW_UNFUNDED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя релизнуть без пополнения.", requestId, {
        code: "ESCROW_UNFUNDED",
      });
    }
    if (result.error === "NO_ACTIVE_CREATOR") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя выполнить выплату без выбранного креатора.", requestId, {
        code: "NO_ACTIVE_CREATOR",
      });
    }

    if ("alreadyResolved" in result && result.alreadyResolved) {
      return ok({ alreadyResolved: true }, requestId);
    }

    if ("alreadyReleased" in result && result.alreadyReleased) {
      return ok({ alreadyReleased: true }, requestId);
    }

    if ("job" in result && result.job) {
      const job = result.job;
      await createNotification(job.brandId, {
        type: "DISPUTE_RESOLVED_RELEASE",
        title: "Спор решён: выплата",
        body: job.title,
        href: `/dashboard/jobs/${job.id}`,
      });
      if (job.activeCreatorId) {
        await createNotification(job.activeCreatorId, {
          type: "DISPUTE_RESOLVED_RELEASE",
          title: "Спор решён: выплата",
          body: job.title,
          href: `/dashboard/work/${job.id}`,
        });
      }

      await emitEvent("DISPUTE_RESOLVED_RELEASE", {
        jobId: job.id,
        disputeId: result.dispute.id,
        resolvedBy: user.id,
        payoutCents: result.payoutCents,
        currency: result.payoutCurrency,
        commissionCents: result.commissionCents,
      }).catch(() => {});
    }

    return ok({ resolved: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/disputes/[id]/resolve-release failed", error, requestId, {
      disputeId: params.id,
    });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось решить спор.", requestId);
  }
}
