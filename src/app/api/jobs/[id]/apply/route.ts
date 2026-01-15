import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { jobApplySchema } from "@/lib/validators";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { getCreatorIds } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!user.creatorProfileId) {
    return NextResponse.json(
      { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора перед откликом." },
      { status: 409 },
    );
  }

  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job || job.status !== "PUBLISHED" || job.moderationStatus !== "APPROVED") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: { portfolioItems: { select: { url: true } } },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора перед откликом." },
        { status: 409 },
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
      return NextResponse.json(
        {
          error: "PROFILE_INCOMPLETE",
          message: "Заполните профиль перед откликом на заказ.",
          completeProfile: true,
          missing: completeness.missing,
          profileUrl: "/dashboard/profile",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = jobApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const creatorIds = getCreatorIds(user);
    const existing = await prisma.application.findFirst({
      where: { jobId: job.id, creatorId: { in: creatorIds } },
    });

    if (existing) {
      return NextResponse.json({ error: "Вы уже откликались на этот заказ." }, { status: 409 });
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

    return NextResponse.json({ ok: true, application: app }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
