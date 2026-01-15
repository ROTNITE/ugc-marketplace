import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getCreatorIds } from "@/lib/authz";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";

const submissionSchema = z.object({
  note: z.string().max(1000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        type: z.enum(["FINAL_VIDEO", "RAW_FILES", "PROJECT_FILE", "OTHER"]),
        url: z.string().url(),
      }),
    )
    .min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, activeCreatorId: true, brandId: true },
  });

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const creatorIds = getCreatorIds(user);
  if (!job.activeCreatorId || !creatorIds.includes(job.activeCreatorId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!["PAUSED", "IN_REVIEW"].includes(job.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const last = await prisma.submission.findFirst({
      where: { jobId: job.id },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (last?.version ?? 0) + 1;

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.submission.create({
        data: {
          jobId: job.id,
          creatorId: user.id,
          version: nextVersion,
          status: "SUBMITTED",
          note: parsed.data.note?.trim() || null,
        },
        select: { id: true, version: true },
      });

      await tx.submissionItem.createMany({
        data: parsed.data.items.map((item) => ({
          submissionId: created.id,
          type: item.type,
          url: item.url.trim(),
        })),
      });

      await tx.job.update({
        where: { id: job.id },
        data: { status: "IN_REVIEW" },
      });

      return created;
    });

    await emitEvent("SUBMISSION_SUBMITTED", {
      jobId: job.id,
      submissionId: submission.id,
      version: submission.version,
    });

    await createNotification(job.brandId, {
      type: "SUBMISSION_SUBMITTED",
      title: "Сданы материалы",
      body: `Версия ${submission.version}`,
      href: `/dashboard/jobs/${job.id}/review`,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
