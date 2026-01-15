import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Причина должна быть не короче 10 символов")
    .max(1000, "Причина слишком длинная"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const parsed = rejectSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REASON", details: parsed.error.flatten() }, { status: 400 });
  }
  const reason = parsed.data.reason;

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      moderationStatus: "REJECTED",
      moderationReason: reason,
      moderatedAt: new Date(),
      moderatedByUserId: moderator ? user.id : null,
    },
  });

  await createNotification(job.brandId, {
    type: "MODERATION_REJECTED",
    title: "Заказ отклонён модерацией",
    body: reason ? `${job.title}\nПричина: ${reason}` : job.title,
    href: `/dashboard/jobs/${job.id}`,
  });

  await emitEvent("JOB_MODERATION_REJECTED", {
    jobId: job.id,
    brandId: job.brandId,
    reason,
    moderatedBy: user.id,
  }).catch(() => {});

  return NextResponse.json({ ok: true, job: updated });
}
