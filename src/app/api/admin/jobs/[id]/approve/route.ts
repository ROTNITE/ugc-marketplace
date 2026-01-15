import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { notifyMatchingAlerts } from "@/lib/jobs/alerts";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const moderator = await prisma.user.findUnique({ where: { id: user.id } });

  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (job.moderationStatus !== "PENDING") {
    return NextResponse.json({ error: "STATUS_NOT_PENDING" }, { status: 409 });
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      moderationStatus: "APPROVED",
      moderationReason: null,
      moderatedAt: new Date(),
      moderatedByUserId: moderator ? user.id : null,
    },
  });

  await createNotification(job.brandId, {
    type: "MODERATION_APPROVED",
    title: "Заказ одобрен модерацией",
    body: job.title,
    href: `/dashboard/jobs/${job.id}`,
  });

  await emitEvent("JOB_MODERATION_APPROVED", {
    jobId: job.id,
    brandId: job.brandId,
    moderatedBy: user.id,
  }).catch(() => {});

  if (updated.status === "PUBLISHED") {
    await notifyMatchingAlerts(updated.id);
  }

  return NextResponse.json({ ok: true, job: updated });
}
