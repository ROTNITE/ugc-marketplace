import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { refundEscrowForJob } from "@/lib/payments/escrow";

const bodySchema = z.object({
  note: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payload = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({
      where: { id: params.id },
      include: { job: { include: { escrow: true } } },
    });

    if (!dispute) return { error: "NOT_FOUND" as const };
    if (dispute.status === "RESOLVED") return { ok: true, alreadyResolved: true, dispute };
    if (dispute.status !== "OPEN") return { error: "STATUS_NOT_OPEN" as const };

    const job = dispute.job;
    if (!job) return { error: "JOB_NOT_FOUND" as const };

    const refund = await refundEscrowForJob({
      jobId: job.id,
      actorUserId: user.id,
      reason: parsed.data.note?.trim() || null,
      source: "DISPUTE",
      tx,
    });

    if (refund.status === "released") return { error: "ESCROW_ALREADY_RELEASED" as const };
    if (refund.status === "job_not_found") return { error: "JOB_NOT_FOUND" as const };

    await tx.job.update({
      where: { id: job.id },
      data: { status: "CANCELED", cancelReason: parsed.data.note?.trim() || "Спор решён: возврат" },
    });

    const updatedDispute = await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: "RESOLVED",
        resolution: "REFUND",
        resolvedAt: new Date(),
        resolvedByUserId: user.id,
        adminNote: parsed.data.note?.trim() || null,
      },
    });

    const refunded = refund.status === "refunded" || refund.status === "already_refunded";
    const escrowId = "escrowId" in refund ? refund.escrowId : null;
    return { ok: true, dispute: updatedDispute, refunded, escrowId, job };
  });

  if (result.error === "NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (result.error === "STATUS_NOT_OPEN") return NextResponse.json({ error: "STATUS_NOT_OPEN" }, { status: 409 });
  if (result.error === "ESCROW_ALREADY_RELEASED") {
    return NextResponse.json({ error: "ESCROW_ALREADY_RELEASED", message: "Нельзя вернуть после выплаты." }, { status: 409 });
  }
  if (result.error === "JOB_NOT_FOUND") return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });

  if ("alreadyResolved" in result && result.alreadyResolved) {
    return NextResponse.json({ ok: true, alreadyResolved: true });
  }

  if ("job" in result && result.job) {
    const job = result.job;
    await createNotification(job.brandId, {
      type: "DISPUTE_RESOLVED_REFUND",
      title: "Спор решён: возврат",
      body: job.title,
      href: `/dashboard/jobs/${job.id}`,
    });
    if (job.activeCreatorId) {
      await createNotification(job.activeCreatorId, {
        type: "DISPUTE_RESOLVED_REFUND",
        title: "Спор решён: возврат",
        body: job.title,
        href: `/dashboard/work/${job.id}`,
      });
    }

    await emitEvent("DISPUTE_RESOLVED_REFUND", {
      jobId: job.id,
      disputeId: result.dispute.id,
      escrowId: result.escrowId,
      refunded: result.refunded,
      resolvedBy: user.id,
    }).catch(() => {});
  }

  const refunded = "refunded" in result ? result.refunded : false;
  return NextResponse.json({ ok: true, refunded });
}
