import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { getBrandIds } from "@/lib/authz";
import { getBrandCompleteness } from "@/lib/profiles/completeness";

const schema = z.object({
  jobId: z.string().uuid(),
  creatorId: z.string().uuid(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!user.brandProfileId) {
    return NextResponse.json(
      { error: "BRAND_PROFILE_REQUIRED", message: "Заполните профиль бренда перед приглашением." },
      { status: 409 },
    );
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });
    const brandCompleteness = getBrandCompleteness({
      companyName: brandProfile?.companyName ?? user.name ?? "",
      website: brandProfile?.website ?? "",
      description: brandProfile?.description ?? "",
    });

    if (brandCompleteness.missing.length > 0) {
      return NextResponse.json(
        {
          error: "BRAND_PROFILE_INCOMPLETE",
          message: "Заполните профиль бренда перед приглашением креатора.",
          completeProfile: true,
          missing: brandCompleteness.missing,
          profileUrl: "/dashboard/profile",
        },
        { status: 409 },
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true, brandId: true, title: true, status: true, moderationStatus: true },
    });

    const brandIds = getBrandIds(user);
    if (!job || !brandIds.includes(job.brandId)) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // допускаем приглашения только по опубликованным заказам
    if (job.status !== "PUBLISHED" || job.moderationStatus === "REJECTED") {
      return NextResponse.json(
        {
          error: "INVITE_ONLY_FOR_PUBLISHED",
          message: "Приглашать можно только опубликованные заказы.",
        },
        { status: 409 },
      );
    }

    const creatorProfile = await prisma.creatorProfile.findFirst({
      where: { OR: [{ id: parsed.data.creatorId }, { userId: parsed.data.creatorId }] },
      select: {
        userId: true,
        verificationStatus: true,
        isPublic: true,
        user: { select: { id: true, role: true } },
      },
    });

    if (!creatorProfile) {
      const creatorUser = await prisma.user.findUnique({
        where: { id: parsed.data.creatorId },
        select: { id: true, role: true },
      });

      if (!creatorUser || creatorUser.role !== "CREATOR") {
        return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
      }

      return NextResponse.json({ error: "CREATOR_PROFILE_REQUIRED" }, { status: 409 });
    }

    if (creatorProfile.user.role !== "CREATOR") {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    if (!creatorProfile.isPublic) {
      return NextResponse.json({ error: "CREATOR_NOT_PUBLIC" }, { status: 409 });
    }

    if (creatorProfile.verificationStatus !== "VERIFIED") {
      return NextResponse.json({ error: "CREATOR_NOT_VERIFIED" }, { status: 409 });
    }

    const messageText = parsed.data.message?.trim() || null;

    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.upsert({
        where: { jobId_creatorId: { jobId: job.id, creatorId: creatorProfile.userId } },
        update: { status: "SENT", message: messageText },
        create: {
          jobId: job.id,
          brandId: user.id,
          creatorId: creatorProfile.userId,
          message: messageText,
        },
      });

      const existingConversation = await tx.conversation.findFirst({
        where: {
          jobId: job.id,
          participants: {
            some: { userId: user.id },
          },
          AND: {
            participants: {
              some: { userId: creatorProfile.userId },
            },
          },
        },
        select: { id: true },
      });

      const conversationId =
        existingConversation?.id ||
        (
          await tx.conversation.create({
            data: {
              jobId: job.id,
              participants: {
                create: [{ userId: user.id }, { userId: creatorProfile.userId }],
              },
            },
            select: { id: true },
          })
        ).id;

      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: user.id,
          body: `Приглашение в заказ "${job.title}"${messageText ? `: ${messageText}` : ""}`,
        },
        select: { id: true },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId, userId: user.id } },
        update: { lastReadAt: new Date() },
        create: { conversationId, userId: user.id, lastReadAt: new Date() },
      });

      return { invitation, conversationId, messageId: msg.id };
    });

    await emitEvent("INVITATION_SENT", {
      jobId: job.id,
      creatorId: creatorProfile.userId,
      brandId: user.id,
      invitationId: result.invitation.id,
      conversationId: result.conversationId,
    });

    return NextResponse.json({ ok: true, invitationId: result.invitation.id, conversationId: result.conversationId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
