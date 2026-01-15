import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
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

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("ADMIN");
    const moderator = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });

    const parsed = await parseJson(_req, rejectSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const profile = await prisma.creatorProfile.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, verificationStatus: true },
    });

    if (!profile) return fail(404, API_ERROR_CODES.NOT_FOUND, "Профиль не найден.", requestId);
    if (profile.verificationStatus !== "PENDING") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Статус уже изменен.", requestId, {
        code: "STATUS_NOT_PENDING",
      });
    }

    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: "REJECTED",
        verificationReason: parsed.data.reason,
        verifiedAt: null,
        verificationReviewedAt: new Date(),
        verificationReviewedByUserId: moderator ? moderator.id : null,
      },
    });

    await createNotification(profile.userId, {
      type: "CREATOR_VERIFICATION_REJECTED",
      title: "Верификация отклонена",
      body: parsed.data.reason,
      href: "/dashboard/profile",
    });

    await emitEvent("CREATOR_VERIFICATION_REJECTED", {
      creatorProfileId: profile.id,
      userId: profile.userId,
      reason: parsed.data.reason,
      reviewedBy: moderator?.id ?? null,
    }).catch(() => {});

    return ok({ rejected: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/creators/[id]/reject failed", error, requestId, { creatorId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отклонить профиль.", requestId);
  }
}
