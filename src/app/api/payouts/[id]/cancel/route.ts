import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, mapAuthError } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { ledgerReference } from "@/lib/payments/references";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireUser();
    if (user.role !== "CREATOR") {
      return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: { id: params.id },
    });

    if (!payout || payout.userId !== user.id) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Заявка не найдена.", requestId);
    }

    if (payout.status !== "PENDING") {
      return fail(
        409,
        API_ERROR_CODES.PAYMENTS_STATE_ERROR,
        "Можно отменить только заявку в статусе PENDING.",
        requestId,
      );
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.payoutRequest.updateMany({
        where: { id: payout.id, status: "PENDING" },
        data: { status: "CANCELED" },
      });
      if (updated.count === 0) {
        throw new Error("INVALID_STATUS");
      }

      await tx.wallet.upsert({
        where: { userId: user.id },
        update: { balanceCents: { increment: payout.amountCents }, currency: payout.currency },
        create: { userId: user.id, balanceCents: payout.amountCents, currency: payout.currency },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "MANUAL_ADJUSTMENT",
          amountCents: payout.amountCents,
          currency: payout.currency,
          toUserId: user.id,
          payoutRequestId: payout.id,
          reference: ledgerReference.payoutCancel(payout.id),
        },
      });
    });

    await emitEvent("PAYOUT_CANCELED", {
      payoutRequestId: payout.id,
      creatorId: user.id,
      amountCents: payout.amountCents,
    });

    return ok({ status: "CANCELED" }, requestId);
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Операция уже была выполнена.", requestId);
    }
    if (error instanceof Error && error.message === "INVALID_STATUS") {
      return fail(
        409,
        API_ERROR_CODES.PAYMENTS_STATE_ERROR,
        "Можно отменить только заявку в статусе PENDING.",
        requestId,
      );
    }
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
