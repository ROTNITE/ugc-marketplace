import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  reason: z.string().min(2).max(500),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите причину отклонения." }, { status: 400 });
  }

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: params.id },
  });

  if (!payout) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (payout.status !== "PENDING") {
    return NextResponse.json({ error: "Заявка уже обработана." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payoutRequest.update({
      where: { id: payout.id },
      data: { status: "REJECTED", reason: parsed.data.reason },
    });

    await tx.wallet.upsert({
      where: { userId: payout.userId },
      update: { balanceCents: { increment: payout.amountCents }, currency: payout.currency },
      create: { userId: payout.userId, balanceCents: payout.amountCents, currency: payout.currency },
    });

    await tx.ledgerEntry.create({
      data: {
        type: "PAYOUT_REJECTED",
        amountCents: payout.amountCents,
        currency: payout.currency,
        toUserId: payout.userId,
        payoutRequestId: payout.id,
      },
    });
  });

  await emitEvent("PAYOUT_REJECTED", {
    creatorId: payout.userId,
    amountCents: payout.amountCents,
    payoutMethod: payout.payoutMethod,
    reason: parsed.data.reason,
  });

  await createNotification(payout.userId, {
    type: "PAYOUT_REJECTED",
    title: "Выплата отклонена",
    body: parsed.data.reason,
    href: "/dashboard/balance",
  });

  return NextResponse.json({ ok: true });
}
