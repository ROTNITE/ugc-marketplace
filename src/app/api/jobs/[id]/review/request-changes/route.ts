import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireBrandOwnerOfJob } from "@/lib/authz";
import { createNotification } from "@/lib/notifications";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";

const bodySchema = z.object({
  comment: z.string().min(1).max(1000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return fail(401, API_ERROR_CODES.UNAUTHORIZED, "Требуется авторизация.", requestId);
  }
  const authz = await requireBrandOwnerOfJob(params.id, user).catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in authz) return authz.errorResponse;
  const { job } = authz;

  const dispute = await prisma.dispute.findUnique({
    where: { jobId: job.id },
    select: { status: true },
  });
  if (dispute?.status === "OPEN") {
    return fail(
      409,
      API_ERROR_CODES.CONFLICT,
      "Идёт спор. Действия временно ограничены.",
      requestId,
      { code: "DISPUTE_OPEN" },
    );
  }

  const parsed = await parseJson(req, bodySchema, requestId);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  const lastSubmission = await prisma.submission.findFirst({
    where: { jobId: job.id },
    orderBy: { version: "desc" },
    select: { id: true, status: true },
  });

  if (!lastSubmission || lastSubmission.status !== "SUBMITTED") {
    return fail(
      409,
      API_ERROR_CODES.CONFLICT,
      "Нет сдачи в статусе SUBMITTED.",
      requestId,
      { code: "NO_SUBMISSION" },
    );
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

  if (job.activeCreatorId) {
    await createNotification(job.activeCreatorId, {
      type: "CHANGES_REQUESTED",
      title: "Нужны правки по работе",
      body: `${job.title}\n${parsed.data.comment}`,
      href: `/dashboard/work/${job.id}`,
    });
  }

  return ok({ status: "CHANGES_REQUESTED" }, requestId);
}
