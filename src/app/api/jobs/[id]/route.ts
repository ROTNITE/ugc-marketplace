import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { JobStatus } from "@prisma/client";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { jobCreateSchema } from "@/lib/validators";
import { getJobForViewerOrThrow } from "@/lib/jobs/visibility";
import { getBrandIds, requireRole, requireUser } from "@/lib/authz";
import { getBrandCompleteness } from "@/lib/profiles/completeness";
import { logApiError } from "@/lib/request-id";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const viewer = session?.user
    ? {
        userId: session.user.id,
        role: session.user.role,
        brandProfileId: session.user.brandProfileId,
        creatorProfileId: session.user.creatorProfileId,
      }
    : null;

  try {
    const job = await getJobForViewerOrThrow({
      jobId: params.id,
      viewer,
      include: { applications: true },
    });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}

const patchSchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  title: z.string().min(8).max(140).optional(),
  description: z.string().max(5000).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    const isOwner = user.role === "BRAND" && getBrandIds(user).includes(job.brandId);
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    const parsed = await parseJson(req, patchSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    if (user.role === "BRAND" && parsed.data.status === "PUBLISHED" && job.status !== "PUBLISHED") {
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
    }

    const shouldResetModeration =
      parsed.data.status === "PUBLISHED" &&
      job.status !== "PUBLISHED" &&
      job.moderationStatus !== "APPROVED";

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(shouldResetModeration
          ? {
              moderationStatus: "PENDING",
              moderationReason: null,
              moderatedAt: null,
              moderatedByUserId: null,
            }
          : {}),
      },
    });

    if (parsed.data.status === "PUBLISHED" && job.status !== "PUBLISHED") {
      await emitEvent("JOB_PUBLISHED", { jobId: updated.id, brandId: user.id });

      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.all(
        admins.map((admin) =>
          createNotification(admin.id, {
            type: "JOB_PUBLISHED",
            title: "Новый заказ на модерации",
            body: updated.title,
            href: "/admin/jobs?status=PENDING",
          }),
        ),
      );
    }

    return ok({ job: updated }, requestId);
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("BRAND");
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { applications: { select: { id: true } }, submissions: { select: { id: true } } },
    });

    if (!job) return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);

    if (!getBrandIds(user).includes(job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    if (job.status === "COMPLETED" || job.status === "CANCELED" || job.activeCreatorId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Редактирование недоступно.", requestId);
    }

    const parsed = await parseJson(req, jobCreateSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;
    const data = parsed.data;

    const moderatedFields: Array<keyof typeof data> = [
      "title",
      "description",
      "platform",
      "niche",
      "deliverablesCount",
      "videoDurationSec",
      "contentFormats",
      "needsPosting",
      "needsWhitelisting",
      "rightsPackage",
      "usageTermDays",
      "revisionRounds",
      "revisionRoundsIncluded",
      "languages",
      "shippingRequired",
      "deliverablesIncludeRaw",
      "deliverablesIncludeProjectFile",
      "subtitlesRequired",
      "musicPolicy",
      "scriptProvided",
      "notes",
      "budgetMin",
      "budgetMax",
      "currency",
      "deadlineType",
      "deadlineDate",
      "brief",
    ];

    const prevValues: Record<string, unknown> = {
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
      brief: job.brief,
    };

    const hasModerationChange = moderatedFields.some((field) => {
      const prev = prevValues[field];
      const next = data[field];
      const normalize = (value: unknown) => {
        if (value instanceof Date) return value.toISOString();
        return typeof value === "object" ? JSON.stringify(value ?? null) : value;
      };
      return normalize(prev) !== normalize(next);
    });

    const shouldResetModeration =
      hasModerationChange && job.moderationStatus !== "PENDING"
        ? true
        : hasModerationChange && job.moderationStatus === "PENDING";

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        title: data.title,
        description: data.description || null,
        platform: data.platform,
        niche: data.niche,
        deliverablesCount: data.deliverablesCount,
        videoDurationSec: data.videoDurationSec,
        contentFormats: data.contentFormats,
        needsPosting: data.needsPosting,
        needsWhitelisting: data.needsWhitelisting,
        rightsPackage: data.rightsPackage,
        usageTermDays: data.usageTermDays ?? null,
        revisionRounds: data.revisionRounds,
        revisionRoundsIncluded: data.revisionRoundsIncluded,
        languages: data.languages,
        shippingRequired: data.shippingRequired,
        deliverablesIncludeRaw: data.deliverablesIncludeRaw,
        deliverablesIncludeProjectFile: data.deliverablesIncludeProjectFile,
        subtitlesRequired: data.subtitlesRequired,
        musicPolicy: data.musicPolicy ?? null,
        scriptProvided: data.scriptProvided,
        notes: data.notes || null,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        currency: data.currency,
        deadlineType: data.deadlineType,
        deadlineDate: data.deadlineType === "DATE" && data.deadlineDate ? new Date(data.deadlineDate) : null,
        // status остаётся прежним
        ...(shouldResetModeration
          ? {
              moderationStatus: "PENDING",
              moderationReason: null,
              moderatedAt: null,
              moderatedByUserId: null,
            }
          : {}),
        brief: data.brief,
      },
    });

    await emitEvent("JOB_UPDATED", { jobId: updated.id, brandId: user.id }).catch(() => {});

    if (shouldResetModeration) {
      await emitEvent("JOB_MODERATION_RESUBMITTED", { jobId: updated.id, brandId: user.id }).catch(() => {});
    }

    await createNotification(user.id, {
      type: "JOB_UPDATED",
      title: "Изменения сохранены",
      body: updated.title,
      href: `/dashboard/jobs`,
    }).catch(() => {});

    return ok({ job: updated }, requestId);
  } catch (err) {
    logApiError("[api] jobs:update failed", err, requestId, { jobId: params.id });
    const mapped = mapAuthError(err, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
