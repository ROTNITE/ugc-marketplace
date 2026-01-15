import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";
import { getBrandCompleteness } from "@/lib/profiles/completeness";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("BRAND");
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, brandId: true, status: true, activeCreatorId: true },
    });

    if (!job || !isBrandOwner(user, job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }
    if (job.activeCreatorId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя публиковать при выбранном креаторе.", requestId, {
        code: "HAS_CREATOR",
      });
    }
    if (job.status !== "PAUSED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Можно публиковать только приостановленный заказ.", requestId, {
        code: "ONLY_PAUSED",
      });
    }

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });
    const completeness = getBrandCompleteness({
      companyName: brandProfile?.companyName ?? user.name ?? "",
      website: brandProfile?.website ?? "",
      description: brandProfile?.description ?? "",
    });
    if (completeness.missing.length > 0) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль бренда перед публикацией заказа.",
        requestId,
        {
          code: "BRAND_PROFILE_INCOMPLETE",
          completeProfile: true,
          missing: completeness.missing,
          profileUrl: "/dashboard/profile",
        },
      );
    }

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { status: "PUBLISHED" },
    });

    return ok({ job: updated }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/unpause failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось опубликовать заказ.", requestId);
  }
}
