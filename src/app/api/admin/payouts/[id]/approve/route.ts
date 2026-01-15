import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

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
      data: { status: "APPROVED" },
    });

    await tx.ledgerEntry.create({
      data: {
        type: "PAYOUT_APPROVED",
        amountCents: payout.amountCents,
        currency: payout.currency,
        toUserId: payout.userId,
        payoutRequestId: payout.id,
      },
    });
  });

  await emitEvent("PAYOUT_APPROVED", {
    creatorId: payout.userId,
    amountCents: payout.amountCents,
    payoutMethod: payout.payoutMethod,
  });

  await createNotification(payout.userId, {
    type: "PAYOUT_APPROVED",
    title: "Выплата подтверждена (в обработке)",
    body: payout.payoutMethod ?? undefined,
    href: "/dashboard/balance",
  });

  return NextResponse.json({ ok: true });
}
