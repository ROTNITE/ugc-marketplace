import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrandIds, getCreatorIds } from "@/lib/authz";

const schema = z.object({
  jobId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: parsed.data.jobId },
      select: { id: true, status: true, brandId: true, activeCreatorId: true, title: true },
    });

    if (!job || job.status !== "COMPLETED") {
      return NextResponse.json({ error: "JOB_NOT_COMPLETED" }, { status: 409 });
    }

    const brandIds = getBrandIds(user);
    const creatorIds = getCreatorIds(user);
    let toUserId: string | null = null;
    if (brandIds.includes(job.brandId)) {
      toUserId = job.activeCreatorId ?? null;
    } else if (job.activeCreatorId && creatorIds.includes(job.activeCreatorId)) {
      toUserId = job.brandId;
    }

    if (!toUserId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const existing = await prisma.review.findUnique({
      where: { jobId_fromUserId: { jobId: job.id, fromUserId: user.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        jobId: job.id,
        fromUserId: user.id,
        toUserId,
        rating: parsed.data.rating,
        text: parsed.data.text?.trim() || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
