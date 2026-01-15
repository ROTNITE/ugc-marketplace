import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    include: { portfolioItems: { select: { url: true } } },
  });

  if (!profile) {
    return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  }

  if (profile.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "ALREADY_VERIFIED" }, { status: 409 });
  }

  if (profile.verificationStatus === "PENDING") {
    return NextResponse.json({ ok: true, status: "PENDING" });
  }

  if (profile.verificationStatus !== "REJECTED") {
    return NextResponse.json({ error: "STATUS_NOT_REJECTED" }, { status: 409 });
  }

  const portfolioLinks = profile.portfolioItems.map((item) => item.url).filter(Boolean);
  const completeness = getCreatorCompleteness({
    displayName: user.name,
    bio: profile.bio,
    platforms: profile.platforms ?? [],
    portfolioLinks,
    pricePerVideo: profile.pricePerVideo ?? null,
  });

  if (completeness.missing.length > 0) {
    return NextResponse.json(
      {
        error: "PROFILE_INCOMPLETE",
        message: "Заполните профиль перед повторной проверкой.",
        completeProfile: true,
        missing: completeness.missing,
        profileUrl: "/dashboard/profile",
      },
      { status: 400 },
    );
  }

  const updated = await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus: "PENDING",
      verificationReason: null,
      verificationReviewedAt: null,
      verificationReviewedByUserId: null,
      verifiedAt: null,
    },
    select: { id: true, userId: true, verificationStatus: true },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, {
        type: "CREATOR_VERIFICATION_REQUESTED",
        title: "Запрос повторной верификации",
        body: user.name ?? user.email ?? updated.id,
        href: "/admin/creators?status=PENDING",
      }),
    ),
  );

  await emitEvent("CREATOR_VERIFICATION_REQUESTED", {
    creatorProfileId: updated.id,
    userId: updated.userId,
  }).catch(() => {});

  return NextResponse.json({ ok: true, status: updated.verificationStatus });
}
