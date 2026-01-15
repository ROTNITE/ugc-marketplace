import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
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

  if (!profile || !profile.verificationCode) {
    return NextResponse.json({ error: "Нет кода для проверки." }, { status: 409 });
  }

  if (profile.verificationStatus === "VERIFIED") {
    return NextResponse.json({ error: "Профиль уже подтвержден." }, { status: 409 });
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
        message: "Заполните профиль перед отправкой на проверку.",
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
      verifiedAt: null,
      verificationReason: null,
      verificationReviewedAt: null,
      verificationReviewedByUserId: null,
    },
    select: { verificationStatus: true },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, {
        type: "CREATOR_VERIFICATION_PENDING",
        title: "Креатор отправил профиль на проверку",
        body: user.id,
        href: "/admin/creators?status=PENDING",
      }),
    ),
  );

  return NextResponse.json({ ok: true, status: updated.verificationStatus });
}
