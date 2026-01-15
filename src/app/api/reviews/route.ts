import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getBrandIds, getCreatorIds } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

const schema = z.object({
  jobId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true, status: true, brandId: true, activeCreatorId: true, title: true },
    });

    if (!job || job.status !== "COMPLETED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Отзыв можно оставить только после завершения.", requestId, {
        code: "JOB_NOT_COMPLETED",
      });
    }

    const brandIds = getBrandIds(user);
    const creatorIds = getCreatorIds(user);
    let toUserId: string | null = null;
    if (brandIds.includes(job.brandId)) {
      toUserId = job.activeCreatorId ?? null;
    } else if (job.activeCreatorId && creatorIds.includes(job.activeCreatorId)) {
      toUserId = job.brandId;
    }

    if (!toUserId) {
      return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
    }

    const existing = await prisma.review.findUnique({
      where: { jobId_fromUserId: { jobId: job.id, fromUserId: user.id } },
      select: { id: true },
    });
    if (existing) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Отзыв уже оставлен.", requestId, {
        code: "ALREADY_REVIEWED",
      });
    }

    const review = await prisma.review.create({
      data: {
        jobId: job.id,
        fromUserId: user.id,
        toUserId,
        rating: parsed.data.rating,
        text: parsed.data.text?.trim() || null,
      },
      select: { id: true },
    });

    return ok({ reviewId: review.id }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/reviews failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось оставить отзыв.", requestId);
  }
}
