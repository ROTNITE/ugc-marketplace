import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireRole("BRAND");
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        brandId: true,
        title: true,
        description: true,
        platform: true,
        niche: true,
        deliverablesCount: true,
        videoDurationSec: true,
        contentFormats: true,
        needsPosting: true,
        needsWhitelisting: true,
        rightsPackage: true,
        usageTermDays: true,
        revisionRounds: true,
        revisionRoundsIncluded: true,
        languages: true,
        shippingRequired: true,
        deliverablesIncludeRaw: true,
        deliverablesIncludeProjectFile: true,
        subtitlesRequired: true,
        musicPolicy: true,
        scriptProvided: true,
        notes: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        deadlineType: true,
        deadlineDate: true,
        brief: true,
      },
    });

    if (!job || !isBrandOwner(user, job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    const copy = await prisma.job.create({
      data: {
        brandId: user.id,
        title: job.title,
        description: job.description,
        platform: job.platform,
        niche: job.niche,
        deliverablesCount: job.deliverablesCount,
        videoDurationSec: job.videoDurationSec,
        contentFormats: job.contentFormats,
        needsPosting: job.needsPosting,
        needsWhitelisting: job.needsWhitelisting,
        rightsPackage: job.rightsPackage,
        usageTermDays: job.usageTermDays,
        revisionRounds: job.revisionRounds,
        revisionRoundsIncluded: job.revisionRoundsIncluded,
        languages: job.languages,
        shippingRequired: job.shippingRequired,
        deliverablesIncludeRaw: job.deliverablesIncludeRaw,
        deliverablesIncludeProjectFile: job.deliverablesIncludeProjectFile,
        subtitlesRequired: job.subtitlesRequired,
        musicPolicy: job.musicPolicy,
        scriptProvided: job.scriptProvided,
        notes: job.notes,
        budgetMin: job.budgetMin,
        budgetMax: job.budgetMax,
        currency: job.currency,
        deadlineType: job.deadlineType,
        deadlineDate: job.deadlineDate,
        status: "DRAFT",
        moderationStatus: "PENDING",
        brief: job.brief ?? undefined,
      },
      select: { id: true },
    });

    return ok({ id: copy.id }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/jobs/[id]/duplicate failed", error, requestId, { jobId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось дублировать заказ.", requestId);
  }
}
