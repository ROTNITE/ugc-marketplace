import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { getCreatorIds } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";
import { createNotification } from "@/lib/notifications";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);

  try {
    const user = await requireRole("CREATOR");
    if (!user.creatorProfileId) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль креатора перед принятием.",
        requestId,
        { code: "CREATOR_PROFILE_REQUIRED", profileUrl: "/dashboard/profile" },
      );
    }
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, jobId: true, creatorId: true, brandId: true },
    });

    const creatorIds = getCreatorIds(user);
    if (!invitation || !creatorIds.includes(invitation.creatorId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Приглашение не найдено.", requestId);
    }

    if (invitation.status !== "SENT") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Приглашение уже обработано.", requestId, {
        code: "ALREADY_HANDLED",
      });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: { portfolioItems: { select: { url: true } } },
    });

    if (!creatorProfile) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль креатора перед принятием.",
        requestId,
        { code: "CREATOR_PROFILE_REQUIRED", profileUrl: "/dashboard/profile" },
      );
    }

    const portfolioLinks = creatorProfile.portfolioItems.map((item) => item.url).filter(Boolean);
    const completeness = getCreatorCompleteness({
      displayName: user.name,
      bio: creatorProfile.bio,
      platforms: creatorProfile.platforms,
      portfolioLinks,
      pricePerVideo: creatorProfile.pricePerVideo,
    });

    if (completeness.missing.length > 0) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль перед принятием приглашения.", requestId, {
        code: "PROFILE_INCOMPLETE",
        completeProfile: true,
        missing: completeness.missing,
        profileUrl: "/dashboard/profile",
      });
    }

    if (creatorProfile.verificationStatus !== "VERIFIED") {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Подтвердите профиль, чтобы принимать приглашения.",
        requestId,
        { code: "CREATOR_NOT_VERIFIED", verifyProfile: true, profileUrl: "/dashboard/profile" },
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: invitation.jobId },
      select: { id: true, status: true, moderationStatus: true, title: true },
    });
    if (!job || job.status !== "PUBLISHED" || job.moderationStatus === "REJECTED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заказ недоступен.", requestId, {
        code: "JOB_NOT_AVAILABLE",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      const application = await tx.application.upsert({
        where: { jobId_creatorId: { jobId: invitation.jobId, creatorId: invitation.creatorId } },
        update: {
          status: "PENDING",
          message: "Приглашение принято",
        },
        create: {
          jobId: invitation.jobId,
          creatorId: invitation.creatorId,
          status: "PENDING",
          message: "Приглашение принято",
        },
        select: { id: true },
      });

      return { applicationId: application.id };
    });

    await emitEvent("INVITATION_ACCEPTED", {
      invitationId: invitation.id,
      jobId: invitation.jobId,
      creatorId: invitation.creatorId,
      applicationId: result.applicationId,
    });

    await createNotification(invitation.brandId, {
      type: "INVITATION_ACCEPTED",
      title: "Приглашение принято",
      body: job.title,
      href: "/dashboard/jobs",
    });

    return ok({ applicationId: result.applicationId }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("[api] invitations:accept failed", error, requestId, { invitationId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось принять приглашение.", requestId);
  }
}
