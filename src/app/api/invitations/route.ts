import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { getBrandIds, requireRole } from "@/lib/authz";
import { getBrandCompleteness } from "@/lib/profiles/completeness";
import { createNotification } from "@/lib/notifications";
import { logApiError } from "@/lib/request-id";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";

const schema = z.object({
  jobId: z.string().uuid(),
  creatorId: z.string().uuid(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("BRAND");
    if (!user.brandProfileId) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль бренда перед приглашением.",
        requestId,
        { code: "BRAND_PROFILE_REQUIRED", profileUrl: "/dashboard/profile" },
      );
    }

    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });
    const brandCompleteness = getBrandCompleteness({
      companyName: brandProfile?.companyName ?? user.name ?? "",
      website: brandProfile?.website ?? "",
      description: brandProfile?.description ?? "",
    });

    if (brandCompleteness.missing.length > 0) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль бренда перед приглашением креатора.",
        requestId,
        {
          code: "BRAND_PROFILE_INCOMPLETE",
          completeProfile: true,
          missing: brandCompleteness.missing,
          profileUrl: "/dashboard/profile",
        },
      );
    }

    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true, brandId: true, title: true, status: true, moderationStatus: true },
    });

    const brandIds = getBrandIds(user);
    if (!job || !brandIds.includes(job.brandId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заказ не найден.", requestId);
    }

    // допускаем приглашения только по опубликованным заказам
    if (job.status !== "PUBLISHED" || job.moderationStatus === "REJECTED") {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Приглашать можно только опубликованные заказы.",
        requestId,
        { code: "INVITE_ONLY_FOR_PUBLISHED" },
      );
    }

    const creatorProfile = await prisma.creatorProfile.findFirst({
      where: { OR: [{ id: parsed.data.creatorId }, { userId: parsed.data.creatorId }] },
      select: {
        userId: true,
        verificationStatus: true,
        isPublic: true,
        user: { select: { id: true, role: true, name: true } },
      },
    });

    if (!creatorProfile) {
      const creatorUser = await prisma.user.findUnique({
        where: { id: parsed.data.creatorId },
        select: { id: true, role: true },
      });

      if (!creatorUser || creatorUser.role !== "CREATOR") {
        return fail(404, API_ERROR_CODES.NOT_FOUND, "Креатор не найден.", requestId, {
          code: "CREATOR_NOT_FOUND",
        });
      }

      return fail(409, API_ERROR_CODES.CONFLICT, "Креатор еще не заполнил профиль.", requestId, {
        code: "CREATOR_PROFILE_REQUIRED",
      });
    }

    if (creatorProfile.user.role !== "CREATOR") {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Креатор не найден.", requestId, {
        code: "CREATOR_NOT_FOUND",
      });
    }

    if (!creatorProfile.isPublic) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Креатор не разрешил показывать профиль.", requestId, {
        code: "CREATOR_NOT_PUBLIC",
      });
    }

    if (creatorProfile.verificationStatus !== "VERIFIED") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Креатор еще не подтвержден.", requestId, {
        code: "CREATOR_NOT_VERIFIED",
      });
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

    await createNotification(creatorProfile.userId, {
      type: "INVITATION_SENT",
      title: "Новое приглашение",
      body: job.title,
      href: "/dashboard/invitations",
    });
    await createNotification(user.id, {
      type: "INVITATION_SENT",
      title: "Приглашение отправлено",
      body: creatorProfile.user.name ? `Креатор: ${creatorProfile.user.name}` : job.title,
      href: `/dashboard/inbox/${result.conversationId}`,
    });

    return ok({ invitationId: result.invitation.id, conversationId: result.conversationId }, requestId);
  } catch (err) {
    logApiError("[api] invitations:create failed", err, requestId);
    const mapped = mapAuthError(err, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
