import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";

const bodySchema = z.object({
  comment: z.string().min(1).max(1000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, brandId: true },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!isBrandOwner(user, job.brandId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { jobId: job.id },
    select: { status: true },
  });
  if (dispute?.status === "OPEN") {
    return NextResponse.json(
      { error: "DISPUTE_OPEN", message: "Идёт спор. Действия временно ограничены." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const lastSubmission = await prisma.submission.findFirst({
    where: { jobId: job.id },
    orderBy: { version: "desc" },
    select: { id: true, status: true },
  });

  if (!lastSubmission || lastSubmission.status !== "SUBMITTED") {
    return NextResponse.json({ error: "NO_SUBMISSION" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.submission.update({
      where: { id: lastSubmission.id },
      data: { status: "CHANGES_REQUESTED", note: parsed.data.comment },
    }),
    prisma.job.update({
      where: { id: job.id },
      data: { status: "PAUSED" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
