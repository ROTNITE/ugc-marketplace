import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { DisputeMessageKind } from "@prisma/client";
import { isBrandOwner, isCreatorOwner } from "@/lib/authz";

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
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.kind === DisputeMessageKind.ADMIN_NOTE && user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: { job: { select: { id: true, title: true, brandId: true, activeCreatorId: true } } },
  });

  if (!dispute || !dispute.job) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const job = dispute.job;
  const isBrandOwnerMatch = user.role === "BRAND" && isBrandOwner(user, job.brandId);
  const isCreator = user.role === "CREATOR" && isCreatorOwner(user, job.activeCreatorId);
  const isAdmin = user.role === "ADMIN";

  if (!isBrandOwnerMatch && !isCreator && !isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
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

  return NextResponse.json({ ok: true, messageId: message.id }, { status: 201 });
}
