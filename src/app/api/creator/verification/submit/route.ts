import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("CREATOR");
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: { portfolioItems: { select: { url: true } } },
    });

    if (!profile || !profile.verificationCode) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нет кода для проверки.", requestId, {
        code: "NO_VERIFICATION_CODE",
      });
    }

    if (profile.verificationStatus === "VERIFIED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Профиль уже подтвержден.", requestId, {
        code: "ALREADY_VERIFIED",
      });
    }

    const portfolioLinks = profile.portfolioItems.map((item) => item.url).filter(Boolean);
    const completeness = getCreatorCompleteness({
      displayName: user.name,
      bio: profile.bio,
      platforms: profile.platforms ?? [],
      portfolioLinks,
      pricePerVideo: profile.pricePerVideo ?? null,
    });

    if (completeness.missing.length > 0) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль перед отправкой на проверку.", requestId, {
        code: "PROFILE_INCOMPLETE",
        completeProfile: true,
        missing: completeness.missing,
        profileUrl: "/dashboard/profile",
      });
    }

    const updated = await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: "PENDING",
        verifiedAt: null,
        verificationReason: null,
        verificationReviewedAt: null,
        verificationReviewedByUserId: null,
      },
      select: { verificationStatus: true },
    });

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        createNotification(admin.id, {
          type: "CREATOR_VERIFICATION_PENDING",
          title: "Креатор отправил профиль на проверку",
          body: user.id,
          href: "/admin/creators?status=PENDING",
        }),
      ),
    );

    return ok({ status: updated.verificationStatus }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/creator/verification/submit failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отправить профиль.", requestId);
  }
}
