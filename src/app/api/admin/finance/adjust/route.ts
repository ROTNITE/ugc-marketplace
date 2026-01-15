import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { Currency } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";

const schema = z.object({
  userId: z.string().uuid(),
  amountCents: z.number().int().min(-1_000_000_000).max(1_000_000_000).refine((v) => v !== 0, {
    message: "Сумма должна быть ненулевой",
  }),
  currency: z.nativeEnum(Currency),
  reason: z.string().trim().min(2).max(500),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, amountCents, currency, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceCents: 0, currency },
      });

      if (amountCents < 0 && wallet.balanceCents + amountCents < 0) {
        throw new Error("NEGATIVE_BALANCE");
      }

      await tx.wallet.update({
        where: { userId },
        data: { balanceCents: { increment: amountCents }, currency },
      });

      const ledger = await tx.ledgerEntry.create({
        data: {
          type: "MANUAL_ADJUSTMENT",
          amountCents: Math.abs(amountCents),
          currency,
          toUserId: amountCents > 0 ? userId : null,
          fromUserId: amountCents < 0 ? userId : null,
          metadata: { reason, signedAmount: amountCents },
        },
        select: { id: true, createdAt: true },
      });

      return { wallet, ledgerId: ledger.id };
    });

    await createNotification(userId, {
      type: "BALANCE_ADJUSTED",
      title: "Корректировка баланса админом",
      body: reason,
      href: "/dashboard/balance",
    });

    await emitEvent("BALANCE_ADJUSTED", {
      userId,
      amountCents,
      currency,
      reason,
      ledgerId: result.ledgerId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "NEGATIVE_BALANCE") {
      return NextResponse.json({ error: "Нельзя уводить баланс в минус." }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
