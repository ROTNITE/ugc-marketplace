import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { requireConversationParticipant, requireUser } from "@/lib/authz";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { rateLimit } from "@/lib/api/rate-limit";

const schema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  const user = await requireUser().catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in user) return user.errorResponse;

  const rate = rateLimit(`message:${user.id}`, { windowMs: 30_000, max: 12 });
  if (!rate.allowed) {
    return fail(
      429,
      API_ERROR_CODES.RATE_LIMITED,
      "Слишком много сообщений. Попробуйте позже.",
      requestId,
      { retryAfterSec: rate.retryAfterSec },
      { headers: { "Retry-After": String(rate.retryAfterSec ?? 1) } },
    );
  }

  const authz = await requireConversationParticipant(params.id, user).catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in authz) return authz.errorResponse;
  const { conversation: conv } = authz;

  try {
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: user.id,
          body: parsed.data.body,
        },
      });

      await tx.conversation.update({
        where: { id: conv.id },
        data: { updatedAt: new Date() },
      });

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: user.id } },
        update: { lastReadAt: created.createdAt },
        create: { conversationId: conv.id, userId: user.id, lastReadAt: created.createdAt },
      });

      return created;
    });

    await emitEvent("MESSAGE_SENT", {
      conversationId: conv.id,
      senderId: user.id,
      messageId: message.id,
    });

    const recipients = conv.participants.filter((p) => p.userId !== user.id);
    await Promise.all(
      recipients.map((participant) =>
        createNotification(participant.userId, {
          type: "MESSAGE_SENT",
          title: "Новое сообщение",
          body: parsed.data.body.slice(0, 200),
          href: `/dashboard/inbox/${conv.id}`,
        }),
      ),
    );

    return ok({ message }, requestId, { status: 201 });
  } catch {
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
