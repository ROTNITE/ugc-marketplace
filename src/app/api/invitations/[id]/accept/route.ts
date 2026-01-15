import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { getCreatorIds } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!user.creatorProfileId) {
    return NextResponse.json(
      { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора перед принятием." },
      { status: 409 },
    );
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, jobId: true, creatorId: true, brandId: true },
    });

    const creatorIds = getCreatorIds(user);
    if (!invitation || !creatorIds.includes(invitation.creatorId)) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (invitation.status !== "SENT") {
      return NextResponse.json({ error: "ALREADY_HANDLED" }, { status: 409 });
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      include: { portfolioItems: { select: { url: true } } },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора перед принятием." },
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
          message: "Заполните профиль перед принятием приглашения.",
          completeProfile: true,
          missing: completeness.missing,
          profileUrl: "/dashboard/profile",
        },
        { status: 400 },
      );
    }

    if (creatorProfile.verificationStatus !== "VERIFIED") {
      return NextResponse.json(
        {
          error: "CREATOR_NOT_VERIFIED",
          message: "Подтвердите профиль, чтобы принимать приглашения.",
          verifyProfile: true,
          profileUrl: "/dashboard/profile",
        },
        { status: 409 },
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: invitation.jobId },
      select: { id: true, status: true, moderationStatus: true },
    });
    if (!job || job.status !== "PUBLISHED" || job.moderationStatus === "REJECTED") {
      return NextResponse.json({ error: "JOB_NOT_AVAILABLE" }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      const application = await tx.application.upsert({
        where: { jobId_creatorId: { jobId: invitation.jobId, creatorId: invitation.creatorId } },
        update: {
          status: "PENDING",
          message: "Приглашение принято",
        },
        create: {
          jobId: invitation.jobId,
          creatorId: invitation.creatorId,
          status: "PENDING",
          message: "Приглашение принято",
        },
        select: { id: true },
      });

      return { applicationId: application.id };
    });

    await emitEvent("INVITATION_ACCEPTED", {
      invitationId: invitation.id,
      jobId: invitation.jobId,
      creatorId: invitation.creatorId,
      applicationId: result.applicationId,
    });

    return NextResponse.json({ ok: true, applicationId: result.applicationId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
