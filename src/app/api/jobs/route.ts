import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jobCreateSchema } from "@/lib/validators";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { parseJobListFilters, buildJobWhere, buildJobOrderBy } from "@/lib/jobs/filters";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { getBrandCompleteness } from "@/lib/profiles/completeness";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = parseJobListFilters(Object.fromEntries(searchParams.entries()));

  const jobs = await prisma.job.findMany({
    where: buildJobWhere(filters),
    orderBy: buildJobOrderBy(filters),
    take: 100,
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Пользователь не найден. Выйдите и войдите снова." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = jobCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректный бриф заказа.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

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
        return NextResponse.json(
          {
            error: "BRAND_PROFILE_INCOMPLETE",
            message: "Заполните профиль бренда перед публикацией заказа.",
            completeProfile: true,
            missing: completeness.missing,
            profileUrl: "/dashboard/profile",
          },
          { status: 409 },
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

    return NextResponse.json({ ok: true, job }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
