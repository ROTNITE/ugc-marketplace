import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { isBrandOwner } from "@/lib/authz";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; applicationId: string } },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, brandId: true, status: true, title: true, budgetMax: true, currency: true },
    });

    if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (!isBrandOwner(user, job.brandId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (job.status === "CLOSED") {
      return NextResponse.json({ error: "Заказ закрыт и не может быть принят." }, { status: 409 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
      select: { id: true, jobId: true, creatorId: true, status: true, priceQuote: true },
    });

    if (!application || application.jobId !== job.id) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "Отклик уже обработан." }, { status: 409 });
    }

    const amountBase = application.priceQuote ?? job.budgetMax;
    const amountCents = Math.max(0, amountBase) * 100;

    const result = await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: application.id },
        data: { status: "ACCEPTED" },
      });

      await tx.job.update({
        where: { id: job.id },
        data: { status: "PAUSED", activeCreatorId: application.creatorId },
      });

      await tx.application.updateMany({
        where: { jobId: job.id, status: "PENDING", NOT: { id: application.id } },
        data: { status: "REJECTED" },
      });

      await tx.escrow.upsert({
        where: { jobId: job.id },
        update: { creatorId: application.creatorId },
        create: {
          jobId: job.id,
          brandId: job.brandId,
          creatorId: application.creatorId,
          amountCents,
          currency: job.currency,
          status: "UNFUNDED",
        },
      });

      const existingConversation = await tx.conversation.findFirst({
        where: {
          jobId: job.id,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: application.creatorId } } },
          ],
        },
        select: { id: true },
      });

      if (existingConversation) {
        return { conversationId: existingConversation.id };
      }

      const conversation = await tx.conversation.create({
        data: {
          jobId: job.id,
          participants: {
            create: [{ userId: user.id }, { userId: application.creatorId }],
          },
        },
        select: { id: true },
      });

      return { conversationId: conversation.id };
    });

    await emitEvent("APPLICATION_ACCEPTED", {
      jobId: job.id,
      creatorId: application.creatorId,
      applicationId: application.id,
      conversationId: result.conversationId,
    });

    await createNotification(application.creatorId, {
      type: "APPLICATION_ACCEPTED",
      title: "Вас приняли в заказ",
      body: job.title,
      href: `/dashboard/inbox/${result.conversationId}`,
    });

    return NextResponse.json({ ok: true, conversationId: result.conversationId });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
