import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Причина должна быть не короче 10 символов")
    .max(1000, "Причина слишком длинная"),
});

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const moderator = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });

  const parsed = rejectSchema.safeParse(await _req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REASON", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, verificationStatus: true },
  });

  if (!profile) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (profile.verificationStatus !== "PENDING") {
    return NextResponse.json({ error: "STATUS_NOT_PENDING" }, { status: 409 });
  }

  await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus: "REJECTED",
      verificationReason: parsed.data.reason,
      verifiedAt: null,
      verificationReviewedAt: new Date(),
      verificationReviewedByUserId: moderator ? moderator.id : null,
    },
  });

  await createNotification(profile.userId, {
    type: "CREATOR_VERIFICATION_REJECTED",
    title: "Верификация отклонена",
    body: parsed.data.reason,
    href: "/dashboard/profile",
  });

  await emitEvent("CREATOR_VERIFICATION_REJECTED", {
    creatorProfileId: profile.id,
    userId: profile.userId,
    reason: parsed.data.reason,
    reviewedBy: moderator?.id ?? null,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
