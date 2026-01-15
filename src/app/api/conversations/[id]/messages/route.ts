import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { participants: true },
  });

  if (!conv) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isParticipant = conv.participants.some((p) => p.userId === user.id);
  if (!isParticipant) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

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

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
