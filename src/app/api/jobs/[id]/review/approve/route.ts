import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { releaseEscrowForJob } from "@/lib/payments/escrow";
import { requireBrandOwnerOfJob, requireUser } from "@/lib/authz";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  const user = await requireUser().catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in user) return user.errorResponse;
  const authz = await requireBrandOwnerOfJob(params.id, user).catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in authz) return authz.errorResponse;
  const { job } = authz;
  if (job.status === "COMPLETED") {
    return ok({ warning: "Заказ уже завершён." }, requestId);
  }

  const dispute = await prisma.dispute.findUnique({
    where: { jobId: job.id },
    select: { status: true },
  });
  if (dispute?.status === "OPEN") {
    return fail(
      409,
      API_ERROR_CODES.CONFLICT,
      "Идёт спор. Приёмка временно недоступна.",
      requestId,
      { code: "DISPUTE_OPEN" },
    );
  }

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
    const payoutHint =
      releaseResult.status === "released"
        ? "Оплата начислена на баланс."
        : releaseResult.status === "unfunded"
          ? "Эскроу не пополнен, выплаты не было."
          : releaseResult.status === "refunded"
            ? "Эскроу был возвращён бренду."
            : releaseResult.status === "already_released"
              ? "Оплата уже была начислена."
              : releaseResult.status === "missing"
                ? "Эскроу не создан."
                : releaseResult.status === "no_active_creator"
                  ? "Исполнитель не выбран."
                  : undefined;

    await createNotification(job.activeCreatorId, {
      type: "JOB_COMPLETED",
      title: "Работа принята",
      body: payoutHint ? `${job.title}\n${payoutHint}` : job.title,
      href: `/dashboard/work/${job.id}`,
    });
  }

  const warning =
    releaseResult.status === "unfunded"
      ? "Эскроу не пополнен - выплаты не произведены."
      : undefined;

  return ok({ warning, releaseStatus: releaseResult.status }, requestId);
}
