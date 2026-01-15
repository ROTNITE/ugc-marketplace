import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { refundEscrowForJob } from "@/lib/payments/escrow";
import { isBrandOwner } from "@/lib/authz";

const schema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const reason = parsed.data.reason?.trim() || null;

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      brandId: true,
      status: true,
      activeCreatorId: true,
      moderationStatus: true,
      title: true,
      cancelReason: true,
      escrow: {
        select: {
          id: true,
          status: true,
          amountCents: true,
          currency: true,
        },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isOwner = user.role === "BRAND" && isBrandOwner(user, job.brandId);
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const dispute = await prisma.dispute.findUnique({
    where: { jobId: job.id },
    select: { status: true },
  });
  if (dispute?.status === "OPEN" && !isAdmin) {
    return NextResponse.json(
      { error: "DISPUTE_OPEN", message: "Идёт спор. Отмена возможна только админом." },
      { status: 409 },
    );
  }

  if (job.status === "COMPLETED") {
    return NextResponse.json({ error: "CANNOT_CANCEL_COMPLETED" }, { status: 409 });
  }

  if (job.status === "IN_REVIEW" && !isAdmin) {
    return NextResponse.json({ error: "ONLY_ADMIN_CAN_CANCEL_ON_REVIEW" }, { status: 409 });
  }

  if (job.status === "CANCELED") {
    return NextResponse.json({ ok: true, alreadyCanceled: true });
  }

  if (job.escrow?.status === "RELEASED") {
    return NextResponse.json(
      { error: "ESCROW_ALREADY_RELEASED", message: "Нельзя вернуть после выплаты." },
      { status: 409 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: job.id },
      data: { status: "CANCELED", cancelReason: reason },
    });

    return refundEscrowForJob({
      jobId: job.id,
      actorUserId: user.id,
      reason,
      source: "CANCEL",
      tx,
    });
  });

  const refunded = result.status === "refunded" || result.status === "already_refunded";

  await createNotification(job.brandId, {
    type: "JOB_CANCELED",
    title: refunded ? "Сделка отменена, эскроу возвращен" : "Сделка отменена",
    body: job.title,
    href: `/dashboard/jobs/${job.id}`,
  });

  if (job.activeCreatorId) {
    await createNotification(job.activeCreatorId, {
      type: "JOB_CANCELED",
      title: "Сделка отменена",
      body: job.title,
      href: `/dashboard/work/${job.id}`,
    });
  }

  return NextResponse.json({ ok: true, refunded });
}
