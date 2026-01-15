import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { requireBrandOwnerOfJob, requireUser } from "@/lib/authz";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";

export async function POST(req: Request, { params }: { params: { jobId: string } }) {
  const requestId = ensureRequestId(req);
  const user = await requireUser().catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in user) return user.errorResponse;
  const authz = await requireBrandOwnerOfJob(params.jobId, user).catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in authz) return authz.errorResponse;
  const { job } = authz;
  if (!job.activeCreatorId) {
    return fail(
      409,
      API_ERROR_CODES.PAYMENTS_STATE_ERROR,
      "Заказ ещё не принят исполнителем.",
      requestId,
    );
  }
  if (job.moderationStatus !== "APPROVED") {
    return fail(
      409,
      API_ERROR_CODES.PAYMENTS_STATE_ERROR,
      "Заказ ещё не прошёл модерацию.",
      requestId,
    );
  }

  const escrow = await prisma.escrow.findUnique({ where: { jobId: job.id } });
  if (!escrow) {
    return fail(409, API_ERROR_CODES.PAYMENTS_STATE_ERROR, "Эскроу не найден.", requestId);
  }

  if (escrow.status !== "UNFUNDED") {
    return ok({ escrow }, requestId);
  }

  let updatedEscrow;
  try {
    updatedEscrow = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.escrow.updateMany({
        where: { id: escrow.id, status: "UNFUNDED" },
        data: { status: "FUNDED", fundedAt: now },
      });

      const current = await tx.escrow.findUnique({ where: { id: escrow.id } });
      if (!current) {
        throw new Error("ESCROW_MISSING");
      }

      if (updated.count === 0) {
        return current;
      }

      await tx.ledgerEntry.create({
        data: {
          type: "ESCROW_FUNDED",
          amountCents: current.amountCents,
          currency: current.currency,
          fromUserId: job.brandId,
          escrowId: current.id,
          reference: `ESCROW_FUND:${current.id}`,
        },
      });

      return current;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Операция уже была выполнена.", requestId);
    }
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }

  if (job.activeCreatorId) {
    await createNotification(job.activeCreatorId, {
      type: "ESCROW_FUNDED",
      title: "Бренд пополнил эскроу",
      body: job.title,
      href: `/dashboard/work/${job.id}`,
    });
  }

  await emitEvent("ESCROW_FUNDED", {
    jobId: job.id,
    escrowId: updatedEscrow.id,
    amountCents: updatedEscrow.amountCents,
  });

  return ok({ escrow: updatedEscrow }, requestId);
}
