import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { releaseEscrowForJob } from "@/lib/payments/escrow";
import { isBrandOwner } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, brandId: true, activeCreatorId: true, title: true, status: true },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!isBrandOwner(user, job.brandId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (job.status === "COMPLETED") {
    return NextResponse.json({ ok: true, warning: "Заказ уже завершён." });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { jobId: job.id },
    select: { status: true },
  });
  if (dispute?.status === "OPEN") {
    return NextResponse.json(
      { error: "DISPUTE_OPEN", message: "Идёт спор. Приёмка временно недоступна." },
      { status: 409 },
    );
  }

  const lastSubmission = await prisma.submission.findFirst({
    where: { jobId: job.id },
    orderBy: { version: "desc" },
    select: { id: true, status: true },
  });

  if (!lastSubmission || lastSubmission.status !== "SUBMITTED") {
    return NextResponse.json({ error: "NO_SUBMISSION" }, { status: 409 });
  }

  const releaseResult = await prisma.$transaction(async (tx) => {
    await tx.submission.update({
      where: { id: lastSubmission.id },
      data: { status: "APPROVED" },
    });

    await tx.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED" },
    });

    return releaseEscrowForJob({ jobId: job.id, actorUserId: user.id, source: "REVIEW", tx });
  });

  await emitEvent("JOB_COMPLETED", { jobId: job.id });

  await createNotification(job.brandId, {
    type: "JOB_COMPLETED",
    title: "Заказ завершён",
    body: job.title,
    href: `/dashboard/jobs/${job.id}`,
  });

  if (job.activeCreatorId) {
    await createNotification(job.activeCreatorId, {
      type: "JOB_COMPLETED",
      title: "Заказ завершён",
      body: job.title,
      href: `/dashboard/work/${job.id}`,
    });
  }

  const warning =
    releaseResult.status === "unfunded"
      ? "Эскроу не пополнен - выплаты не произведены."
      : undefined;

  return NextResponse.json({ ok: true, warning });
}
