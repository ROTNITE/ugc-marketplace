import { prisma } from "@/lib/prisma";
import { jobApplySchema } from "@/lib/validators";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { getCreatorIds, requireRole } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, mapAuthError } from "@/lib/api/contract";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("CREATOR");
    if (!user.creatorProfileId) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль креатора перед откликом.",
        requestId,
        { code: "CREATOR_PROFILE_REQUIRED", profileUrl: "/dashboard/profile" },
      );
    }

    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job || job.status !== "PUBLISHED" || job.moderationStatus !== "APPROVED") {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: { portfolioItems: { select: { url: true } } },
    });

    if (!creatorProfile) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль креатора перед откликом.",
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
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль перед откликом на заказ.",
        requestId,
        {
          code: "PROFILE_INCOMPLETE",
          completeProfile: true,
          missing: completeness.missing,
          profileUrl: "/dashboard/profile",
        },
      );
    }

    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Требуется тело запроса.", requestId);
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Некорректный JSON.", requestId);
    }
    const parsed = jobApplySchema.safeParse(body);
    if (!parsed.success) {
      return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Некорректные данные.", requestId, parsed.error.flatten());
    }
    const normalizedMessage = parsed.data.message?.trim() ?? "";
    const hasPrice = typeof parsed.data.priceQuote === "number";
    if (!normalizedMessage && !hasPrice) {
      return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Требуется тело запроса.", requestId);
    }

    const creatorIds = getCreatorIds(user);
    const existing = await prisma.application.findFirst({
      where: { jobId: job.id, creatorId: { in: creatorIds } },
    });

    if (existing) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Вы уже откликались на этот заказ.", requestId);
    }

    const app = await prisma.application.create({
      data: {
        jobId: job.id,
        creatorId: user.id,
        message: parsed.data.message || null,
        priceQuote: parsed.data.priceQuote ?? null,
      },
    });

    await emitEvent("APPLICATION_CREATED", {
      jobId: job.id,
      creatorId: app.creatorId,
      applicationId: app.id,
    });

    await createNotification(job.brandId, {
      type: "APPLICATION_CREATED",
      title: "Новый отклик на заказ",
      body: job.title,
      href: `/dashboard/jobs/${job.id}/applications`,
    });

    return ok({ application: app }, requestId, { status: 201 });
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
