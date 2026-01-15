import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const amountCents = Number(payload?.amountCents);
  const payoutMethod = typeof payload?.payoutMethod === "string" ? payload.payoutMethod.trim() : "";

  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Введите сумму больше нуля." }, { status: 400 });
  }
  if (!payoutMethod) {
    return NextResponse.json({ error: "Укажите способ выплаты." }, { status: 400 });
  }

  try {
    const settings = await getPlatformSettings();
    const result = await prisma.$transaction(async (tx) => {
      const creatorProfile = await tx.creatorProfile.findUnique({
        where: { userId: user.id },
        select: { currency: true },
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          balanceCents: 0,
          currency: creatorProfile?.currency ?? settings.defaultCurrency,
        },
      });

      if (wallet.balanceCents < amountCents) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const payout = await tx.payoutRequest.create({
        data: {
          userId: user.id,
          amountCents,
          currency: wallet.currency,
          payoutMethod,
          status: "PENDING",
        },
      });

      await tx.wallet.update({
        where: { userId: user.id },
        data: { balanceCents: { decrement: amountCents } },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "PAYOUT_REQUESTED",
          amountCents,
          currency: wallet.currency,
          fromUserId: user.id,
          payoutRequestId: payout.id,
        },
      });

      return { payout };
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        createNotification(admin.id, {
          type: "PAYOUT_REQUESTED",
          title: "Новая заявка на выплату",
          body: `Сумма: ${Math.round(result.payout.amountCents / 100)}`,
          href: "/admin",
        }),
      ),
    );

    await emitEvent("PAYOUT_REQUESTED", {
      payoutRequestId: result.payout.id,
      creatorId: user.id,
      amountCents: result.payout.amountCents,
    });

    return NextResponse.json({ ok: true, payout: result.payout });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Недостаточно средств на балансе." }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
