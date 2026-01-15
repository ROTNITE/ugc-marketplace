import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { DisputeMessageKind } from "@prisma/client";
import { isBrandOwner, isCreatorOwner } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(DisputeMessageKind.MESSAGE),
    text: z.string().min(3).max(2000),
  }),
  z.object({
    kind: z.literal(DisputeMessageKind.EVIDENCE_LINK),
    links: z.array(z.string().min(3).max(500)).min(1).max(10),
  }),
  z.object({
    kind: z.literal(DisputeMessageKind.ADMIN_NOTE),
    text: z.string().min(3).max(2000),
  }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    if (parsed.data.kind === DisputeMessageKind.ADMIN_NOTE && user.role !== "ADMIN") {
      return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: params.id },
      include: { job: { select: { id: true, title: true, brandId: true, activeCreatorId: true } } },
    });

    if (!dispute || !dispute.job) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Спор не найден.", requestId);
    }

    const job = dispute.job;
    const isBrandOwnerMatch = user.role === "BRAND" && isBrandOwner(user, job.brandId);
    const isCreator = user.role === "CREATOR" && isCreatorOwner(user, job.activeCreatorId);
    const isAdmin = user.role === "ADMIN";

    if (!isBrandOwnerMatch && !isCreator && !isAdmin) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Спор не найден.", requestId);
    }

    const links =
      parsed.data.kind === DisputeMessageKind.EVIDENCE_LINK
        ? parsed.data.links.map((link) => link.trim()).filter(Boolean)
        : [];

    const message = await prisma.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        authorUserId: user.id,
        authorRole: user.role,
        kind: parsed.data.kind,
        text:
          parsed.data.kind === DisputeMessageKind.EVIDENCE_LINK
            ? null
            : parsed.data.text?.trim() || null,
        links: links.length > 0 ? links : undefined,
      },
      select: { id: true, kind: true },
    });

    const notifyBrand = job.brandId;
    const notifyCreator = job.activeCreatorId;
    const messageTitle =
      parsed.data.kind === DisputeMessageKind.ADMIN_NOTE
        ? "Комментарий администратора по спору"
        : "Новое сообщение в споре";
    const messageBody =
      parsed.data.kind === DisputeMessageKind.EVIDENCE_LINK
        ? "Добавлены ссылки-доказательства."
        : parsed.data.text?.slice(0, 160) ?? "Новое сообщение.";

    const notifications: Array<Promise<void>> = [];

    if (user.role === "ADMIN") {
      if (notifyBrand) {
        notifications.push(
          createNotification(notifyBrand, {
            type: "DISPUTE_MESSAGE_ADDED",
            title: messageTitle,
            body: messageBody,
            href: `/dashboard/jobs/${job.id}/review`,
          }),
        );
      }
      if (notifyCreator) {
        notifications.push(
          createNotification(notifyCreator, {
            type: "DISPUTE_MESSAGE_ADDED",
            title: messageTitle,
            body: messageBody,
            href: `/dashboard/work/${job.id}`,
          }),
        );
      }
    } else if (isBrandOwnerMatch && notifyCreator) {
      notifications.push(
        createNotification(notifyCreator, {
          type: "DISPUTE_MESSAGE_ADDED",
          title: messageTitle,
          body: messageBody,
          href: `/dashboard/work/${job.id}`,
        }),
      );
    } else if (isCreator && notifyBrand) {
      notifications.push(
        createNotification(notifyBrand, {
          type: "DISPUTE_MESSAGE_ADDED",
          title: messageTitle,
          body: messageBody,
          href: `/dashboard/jobs/${job.id}/review`,
        }),
      );
    }

    await Promise.all(notifications);

    await emitEvent("DISPUTE_MESSAGE_ADDED", {
      disputeId: dispute.id,
      jobId: job.id,
      kind: message.kind,
      authorRole: user.role,
    }).catch(() => {});

    return ok({ messageId: message.id }, requestId, { status: 201 });
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/disputes/[id]/messages failed", error, requestId, { disputeId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отправить сообщение.", requestId);
  }
}
