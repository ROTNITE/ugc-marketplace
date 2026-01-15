import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { isBrandOwner } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const job = await prisma.job.findUnique({
    where: { id: params.jobId },
    select: { id: true, brandId: true, activeCreatorId: true, moderationStatus: true, title: true },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!isBrandOwner(user, job.brandId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!job.activeCreatorId) {
    return NextResponse.json({ error: "Заказ ещё не принят исполнителем." }, { status: 409 });
  }
  if (job.moderationStatus !== "APPROVED") {
    return NextResponse.json({ error: "Заказ ещё не прошёл модерацию." }, { status: 409 });
  }

  const escrow = await prisma.escrow.findUnique({ where: { jobId: job.id } });
  if (!escrow) return NextResponse.json({ error: "Эскроу не найден." }, { status: 409 });

  if (escrow.status !== "UNFUNDED") {
    return NextResponse.json({ ok: true, escrow });
  }

  const updatedEscrow = await prisma.$transaction(async (tx) => {
    const nextEscrow = await tx.escrow.update({
      where: { id: escrow.id },
      data: { status: "FUNDED", fundedAt: new Date() },
    });

    await tx.ledgerEntry.create({
      data: {
        type: "ESCROW_FUNDED",
        amountCents: escrow.amountCents,
        currency: escrow.currency,
        fromUserId: job.brandId,
        escrowId: escrow.id,
      },
    });

    return nextEscrow;
  });

  if (job.activeCreatorId) {
    await createNotification(job.activeCreatorId, {
      type: "ESCROW_FUNDED",
      title: "Бренд пополнил эскроу",
      body: job.title,
      href: `/dashboard/work/${job.id}`,
    });
  }

  await emitEvent("ESCROW_FUNDED", {
    jobId: job.id,
    escrowId: updatedEscrow.id,
    amountCents: updatedEscrow.amountCents,
  });

  return NextResponse.json({ ok: true, escrow: updatedEscrow });
}
