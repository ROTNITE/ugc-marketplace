import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { isBrandOwner } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      brandId: true,
      title: true,
      moderationStatus: true,
    },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isOwner = user.role === "BRAND" && isBrandOwner(user, job.brandId);
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (job.moderationStatus === "APPROVED") {
    return NextResponse.json({ error: "ALREADY_APPROVED" }, { status: 409 });
  }

  if (job.moderationStatus === "PENDING") {
    return NextResponse.json({ ok: true, job });
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      moderationStatus: "PENDING",
      moderationReason: null,
      moderatedAt: null,
      moderatedByUserId: null,
    },
  });

  await createNotification(job.brandId, {
    type: "MODERATION_RESUBMITTED",
    title: "Заказ отправлен на повторную модерацию",
    body: updated.title,
    href: `/dashboard/jobs/${updated.id}`,
  });

  await emitEvent("JOB_MODERATION_RESUBMITTED", {
    jobId: updated.id,
    brandId: updated.brandId,
    byUserId: user.id,
  }).catch(() => {});

  return NextResponse.json({ ok: true, job: updated });
}
