import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobCreateSchema } from "@/lib/validators";
import { parseJobListFilters, buildJobWhere, buildJobOrderBy, buildJobCursorWhere, type JobCursor } from "@/lib/jobs/filters";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { getBrandCompleteness } from "@/lib/profiles/completeness";
import { decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());
  const filters = parseJobListFilters(params);
  const limit = parseLimit(params);
  const cursor = decodeCursor<JobCursor>(parseCursor(params));

  const where = buildJobWhere(filters);
  const cursorWhere = buildJobCursorWhere(filters, cursor);
  if (cursorWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: buildJobOrderBy(filters),
    take: limit + 1,
    select: {
      id: true,
      title: true,
      description: true,
      platform: true,
      niche: true,
      rightsPackage: true,
      budgetMin: true,
      budgetMax: true,
      currency: true,
      deadlineDate: true,
      deliverablesCount: true,
      createdAt: true,
    },
  });

  const { items, nextCursor } = sliceWithNextCursor(jobs, limit, (job) => ({
    id: job.id,
    createdAt: job.createdAt.toISOString(),
    budgetMax: job.budgetMax,
  }));

  return NextResponse.json({ items, nextCursor });
}

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("BRAND");
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Пользователь не найден.", requestId);
    }

    const parsed = await parseJson(req, jobCreateSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const data = parsed.data;
    const nextStatus = data.status ?? "PUBLISHED";

    if (nextStatus === "PUBLISHED") {
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

    const job = await prisma.job.create({
      data: {
        brandId: user.id,
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
        status: nextStatus,
        moderationStatus: "PENDING",
        brief: data.brief,
      },
    });

    if (job.status === "PUBLISHED") {
      await emitEvent("JOB_PUBLISHED", { jobId: job.id, brandId: user.id });

      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      await Promise.all(
        admins.map((admin) =>
          createNotification(admin.id, {
            type: "JOB_PUBLISHED",
            title: "Новый заказ на модерации",
            body: job.title,
            href: "/admin/jobs?status=PENDING",
          }),
        ),
      );
    }

    return ok({ job }, requestId, { status: 201 });
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
