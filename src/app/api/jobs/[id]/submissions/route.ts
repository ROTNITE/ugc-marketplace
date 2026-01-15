import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";
import { requireJobActiveCreator } from "@/lib/authz";
import { submissionSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  try {
    const { user, job } = await requireJobActiveCreator(params.id);
    if (!["PAUSED", "IN_REVIEW"].includes(job.status)) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Сдача недоступна для этого статуса.", requestId);
    }

    const parsed = await parseJson(req, submissionSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

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

    return ok({ submissionId: submission.id, version: submission.version }, requestId);
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
