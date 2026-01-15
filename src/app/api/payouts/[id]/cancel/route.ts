import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: params.id },
  });

  if (!payout || payout.userId !== user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (payout.status !== "PENDING") {
    return NextResponse.json({ error: "Можно отменить только заявку в статусе PENDING." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payoutRequest.update({
        where: { id: payout.id },
        data: { status: "CANCELED" },
      });

      await tx.wallet.upsert({
        where: { userId: user.id },
        update: { balanceCents: { increment: payout.amountCents }, currency: payout.currency },
        create: { userId: user.id, balanceCents: payout.amountCents, currency: payout.currency },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "MANUAL_ADJUSTMENT",
          amountCents: payout.amountCents,
          currency: payout.currency,
          toUserId: user.id,
          payoutRequestId: payout.id,
        },
      });
    });

    await emitEvent("PAYOUT_CANCELED", {
      payoutRequestId: payout.id,
      creatorId: user.id,
      amountCents: payout.amountCents,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
