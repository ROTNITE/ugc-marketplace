import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("ADMIN");
    const moderator = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });

    const profile = await prisma.creatorProfile.findUnique({
      where: { id: params.id },
      select: { id: true, verificationStatus: true, userId: true },
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
        verificationStatus: "VERIFIED",
        verificationReason: null,
        verifiedAt: new Date(),
        verificationReviewedAt: new Date(),
        verificationReviewedByUserId: moderator ? moderator.id : null,
      },
    });

    await createNotification(profile.userId, {
      type: "CREATOR_VERIFIED",
      title: "Верификация пройдена",
      body: "Ваш профиль подтверждён модератором.",
      href: "/dashboard/profile",
    });

    await emitEvent("CREATOR_VERIFIED", {
      creatorProfileId: profile.id,
      userId: profile.userId,
      reviewedBy: moderator?.id ?? null,
    }).catch(() => {});

    return ok({ verified: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/creators/[id]/verify failed", error, requestId, { creatorId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось подтвердить профиль.", requestId);
  }
}
