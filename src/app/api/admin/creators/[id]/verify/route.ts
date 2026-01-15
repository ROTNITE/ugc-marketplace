import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const moderator = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });

  const profile = await prisma.creatorProfile.findUnique({
    where: { id: params.id },
    select: { id: true, verificationStatus: true, userId: true },
  });

  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (profile.verificationStatus !== "PENDING") {
    return NextResponse.json({ error: "STATUS_NOT_PENDING" }, { status: 409 });
  }

  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus: "VERIFIED",
      verificationReason: null,
      verifiedAt: new Date(),
      verificationReviewedAt: new Date(),
      verificationReviewedByUserId: moderator ? moderator.id : null,
    },
  });

  await createNotification(profile.userId, {
    type: "CREATOR_VERIFIED",
    title: "Верификация пройдена",
    body: "Ваш профиль подтверждён модератором.",
    href: "/dashboard/profile",
  });

  await emitEvent("CREATOR_VERIFIED", {
    creatorProfileId: profile.id,
    userId: profile.userId,
    reviewedBy: moderator?.id ?? null,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
