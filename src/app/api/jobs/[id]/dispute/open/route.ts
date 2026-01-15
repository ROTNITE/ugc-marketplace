import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { getBrandIds, getCreatorIds } from "@/lib/authz";
import { DisputeReason, DisputeStatus } from "@prisma/client";

const bodySchema = z.object({
  reason: z.nativeEnum(DisputeReason),
  message: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND" && user.role !== "CREATOR") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (user.role === "BRAND" && !user.brandProfileId) {
    return NextResponse.json(
      { error: "BRAND_PROFILE_REQUIRED", message: "Заполните профиль бренда перед спором." },
      { status: 409 },
    );
  }
  if (user.role === "CREATOR" && !user.creatorProfileId) {
    return NextResponse.json(
      { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора перед спором." },
      { status: 409 },
    );
  }

  const payload = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, brandId: true, activeCreatorId: true, status: true, title: true },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (job.status === "COMPLETED" || job.status === "CANCELED") {
    return NextResponse.json({ error: "JOB_ALREADY_FINISHED" }, { status: 409 });
  }
  if (!job.activeCreatorId) {
    return NextResponse.json({ error: "NO_ACTIVE_CREATOR" }, { status: 409 });
  }

  const brandIds = getBrandIds(user);
  const creatorIds = getCreatorIds(user);
  const isBrandOwner = user.role === "BRAND" && brandIds.includes(job.brandId);
  const isCreator = user.role === "CREATOR" && creatorIds.includes(job.activeCreatorId);
  if (!isBrandOwner && !isCreator) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const existing = await prisma.dispute.findUnique({
    where: { jobId: job.id },
    select: { id: true, status: true },
  });

  if (existing?.status === DisputeStatus.OPEN) {
    return NextResponse.json({ ok: true, disputeId: existing.id });
  }
  if (existing?.status === DisputeStatus.RESOLVED) {
    return NextResponse.json({ error: "DISPUTE_ALREADY_RESOLVED" }, { status: 409 });
  }
  if (existing) {
    return NextResponse.json({ error: "DISPUTE_NOT_ALLOWED" }, { status: 409 });
  }

  const dispute = await prisma.dispute.create({
    data: {
      jobId: job.id,
      openedByUserId: user.id,
      openedByRole: user.role,
      reason: parsed.data.reason,
      message: parsed.data.message?.trim() || null,
    },
    select: { id: true },
  });

  const notifyTarget = isBrandOwner ? job.activeCreatorId : job.brandId;
  if (notifyTarget) {
    await createNotification(notifyTarget, {
      type: "DISPUTE_OPENED",
      title: "Открыт спор по заказу",
      body: job.title,
      href: isBrandOwner ? `/dashboard/work/${job.id}` : `/dashboard/jobs/${job.id}/review`,
    });
  }

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  await Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, {
        type: "DISPUTE_OPENED",
        title: "Новый спор",
        body: job.title,
        href: `/admin/disputes/${dispute.id}`,
      }),
    ),
  );

  await emitEvent("DISPUTE_OPENED", {
    jobId: job.id,
    disputeId: dispute.id,
    openerUserId: user.id,
    openerRole: user.role,
    reason: parsed.data.reason,
  }).catch(() => {});

  return NextResponse.json({ ok: true, disputeId: dispute.id });
}
