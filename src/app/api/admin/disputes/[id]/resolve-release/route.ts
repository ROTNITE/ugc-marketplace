import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { releaseEscrowForJob } from "@/lib/payments/escrow";

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
    if (!job.activeCreatorId) return { error: "NO_ACTIVE_CREATOR" as const };

    const release = await releaseEscrowForJob({ jobId: job.id, actorUserId: user.id, source: "DISPUTE", tx });

    if (release.status === "job_not_found") return { error: "JOB_NOT_FOUND" as const };
    if (release.status === "missing") return { error: "ESCROW_MISSING" as const };
    if (release.status === "refunded") return { error: "ESCROW_REFUNDED" as const };
    if (release.status === "unfunded") return { error: "ESCROW_UNFUNDED" as const };
    if (release.status === "no_active_creator") return { error: "NO_ACTIVE_CREATOR" as const };

    if (release.status === "already_released") {
      const resolved = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED",
          resolution: "RELEASE",
          resolvedAt: new Date(),
          resolvedByUserId: user.id,
          adminNote: parsed.data.note?.trim() || null,
        },
      });
      return { ok: true, alreadyReleased: true, dispute: resolved, job };
    }

    const lastSubmission = await tx.submission.findFirst({
      where: { jobId: job.id },
      orderBy: { version: "desc" },
      select: { id: true },
    });
    if (lastSubmission) {
      await tx.submission.update({
        where: { id: lastSubmission.id },
        data: { status: "APPROVED" },
      });
    }

    await tx.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED" },
    });

    const updatedDispute = await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: "RESOLVED",
        resolution: "RELEASE",
        resolvedAt: new Date(),
        resolvedByUserId: user.id,
        adminNote: parsed.data.note?.trim() || null,
      },
    });

    return {
      ok: true,
      dispute: updatedDispute,
      job,
      payoutCents: release.payoutCents,
      payoutCurrency: release.payoutCurrency,
      commissionCents: release.commissionCents,
    };
  });

  if (result.error === "NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (result.error === "STATUS_NOT_OPEN") return NextResponse.json({ error: "STATUS_NOT_OPEN" }, { status: 409 });
  if (result.error === "JOB_NOT_FOUND") return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  if (result.error === "ESCROW_MISSING") {
    return NextResponse.json({ error: "ESCROW_MISSING", message: "Эскроу не найден." }, { status: 409 });
  }
  if (result.error === "ESCROW_REFUNDED") {
    return NextResponse.json({ error: "ESCROW_REFUNDED", message: "Эскроу уже возвращён." }, { status: 409 });
  }
  if (result.error === "ESCROW_UNFUNDED") {
    return NextResponse.json({ error: "ESCROW_UNFUNDED", message: "Нельзя релизнуть без пополнения." }, { status: 409 });
  }
  if (result.error === "NO_ACTIVE_CREATOR") {
    return NextResponse.json(
      { error: "NO_ACTIVE_CREATOR", message: "Нельзя выполнить выплату без выбранного креатора." },
      { status: 409 },
    );
  }

  if ("alreadyResolved" in result && result.alreadyResolved) {
    return NextResponse.json({ ok: true, alreadyResolved: true });
  }

  if ("alreadyReleased" in result && result.alreadyReleased) {
    return NextResponse.json({ ok: true, alreadyReleased: true });
  }

  if ("job" in result && result.job) {
    const job = result.job;
    await createNotification(job.brandId, {
      type: "DISPUTE_RESOLVED_RELEASE",
      title: "Спор решён: выплата",
      body: job.title,
      href: `/dashboard/jobs/${job.id}`,
    });
    if (job.activeCreatorId) {
      await createNotification(job.activeCreatorId, {
        type: "DISPUTE_RESOLVED_RELEASE",
        title: "Спор решён: выплата",
        body: job.title,
        href: `/dashboard/work/${job.id}`,
      });
    }

    await emitEvent("DISPUTE_RESOLVED_RELEASE", {
      jobId: job.id,
      disputeId: result.dispute.id,
      resolvedBy: user.id,
      payoutCents: result.payoutCents,
      currency: result.payoutCurrency,
      commissionCents: result.commissionCents,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
