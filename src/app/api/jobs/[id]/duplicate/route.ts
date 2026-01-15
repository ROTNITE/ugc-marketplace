import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

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
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
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

  return NextResponse.json({ ok: true, id: copy.id });
}
