import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireBrandOwnerOfJob, requireCreatorParticipantOfJob, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { DisputeReason, DisputeStatus } from "@prisma/client";
import { logApiError } from "@/lib/request-id";

const bodySchema = z.object({
  reason: z.nativeEnum(DisputeReason),
  message: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    if (user.role !== "BRAND" && user.role !== "CREATOR") {
      return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
    }
    if (user.role === "BRAND" && !user.brandProfileId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль бренда перед спором.", requestId, {
        code: "BRAND_PROFILE_REQUIRED",
        profileUrl: "/dashboard/profile",
      });
    }
    if (user.role === "CREATOR" && !user.creatorProfileId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль креатора перед спором.", requestId, {
        code: "CREATOR_PROFILE_REQUIRED",
        profileUrl: "/dashboard/profile",
      });
    }

    const parsed = await parseJson(req, bodySchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const authz = await (user.role === "BRAND"
      ? requireBrandOwnerOfJob(params.id, user)
      : requireCreatorParticipantOfJob(params.id, user)
    ).catch((error) => {
      const mapped = mapAuthError(error, requestId);
      if (mapped) return { errorResponse: mapped };
      return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
    });

    if ("errorResponse" in authz) return authz.errorResponse;
    const { job } = authz;

    if (job.status === "COMPLETED" || job.status === "CANCELED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заказ уже завершён.", requestId, {
        code: "JOB_ALREADY_FINISHED",
      });
    }
    if (!job.activeCreatorId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нет выбранного креатора.", requestId, {
        code: "NO_ACTIVE_CREATOR",
      });
    }

    const isBrandOwner = user.role === "BRAND";

    const existing = await prisma.dispute.findUnique({
      where: { jobId: job.id },
      select: { id: true, status: true },
    });

    if (existing?.status === DisputeStatus.OPEN) {
      return ok({ disputeId: existing.id }, requestId);
    }
    if (existing?.status === DisputeStatus.RESOLVED) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Спор уже решён.", requestId, {
        code: "DISPUTE_ALREADY_RESOLVED",
      });
    }
    if (existing) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя открыть спор.", requestId, {
        code: "DISPUTE_NOT_ALLOWED",
      });
    }

    const dispute = await prisma.dispute.create({
      data: {
        jobId: job.id,
        openedByUserId: user.id,
        openedByRole: user.role,
        reason: parsed.data.reason,
        message: parsed.data.message?.trim() || null,
      },
      select: { id: true },
    });

    const notifyTarget = isBrandOwner ? job.activeCreatorId : job.brandId;
    if (notifyTarget) {
      await createNotification(notifyTarget, {
        type: "DISPUTE_OPENED",
        title: "Открыт спор по заказу",
        body: job.title,
        href: isBrandOwner ? `/dashboard/work/${job.id}` : `/dashboard/jobs/${job.id}/review`,
      });
    }

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        createNotification(admin.id, {
          type: "DISPUTE_OPENED",
          title: "Новый спор",
          body: job.title,
          href: `/admin/disputes/${dispute.id}`,
        }),
      ),
    );

    await emitEvent("DISPUTE_OPENED", {
      jobId: job.id,
      disputeId: dispute.id,
      openerUserId: user.id,
      openerRole: user.role,
      reason: parsed.data.reason,
    }).catch(() => {});

    return ok({ disputeId: dispute.id }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/dispute/open failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось открыть спор.", requestId);
  }
}
