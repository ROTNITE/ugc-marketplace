import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { requireAdmin } from "@/lib/authz";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { ledgerReference } from "@/lib/payments/references";

const schema = z.object({
  reason: z.string().min(2).max(500),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  const authz = await requireAdmin().catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in authz) return authz.errorResponse;

  const parsed = await parseJson(req, schema, requestId);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  const payout = await prisma.payoutRequest.findUnique({
    where: { id: params.id },
  });

  if (!payout) {
    return fail(404, API_ERROR_CODES.NOT_FOUND, "Заявка не найдена.", requestId);
  }
  if (payout.status !== "PENDING") {
    return fail(409, API_ERROR_CODES.PAYMENTS_STATE_ERROR, "Заявка уже обработана.", requestId);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.payoutRequest.updateMany({
        where: { id: payout.id, status: "PENDING" },
        data: { status: "REJECTED", reason: parsed.data.reason },
      });
      if (updated.count === 0) {
        throw new Error("INVALID_STATUS");
      }

      await tx.wallet.upsert({
        where: { userId: payout.userId },
        update: { balanceCents: { increment: payout.amountCents }, currency: payout.currency },
        create: { userId: payout.userId, balanceCents: payout.amountCents, currency: payout.currency },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "PAYOUT_REJECTED",
          amountCents: payout.amountCents,
          currency: payout.currency,
          toUserId: payout.userId,
          payoutRequestId: payout.id,
          reference: ledgerReference.payoutReject(payout.id),
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Операция уже была выполнена.", requestId);
    }
    if (error instanceof Error && error.message === "INVALID_STATUS") {
      return fail(409, API_ERROR_CODES.PAYMENTS_STATE_ERROR, "Заявка уже обработана.", requestId);
    }
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }

  await emitEvent("PAYOUT_REJECTED", {
    creatorId: payout.userId,
    amountCents: payout.amountCents,
    payoutMethod: payout.payoutMethod,
    reason: parsed.data.reason,
  });

  await createNotification(payout.userId, {
    type: "PAYOUT_REJECTED",
    title: "Выплата отклонена",
    body: parsed.data.reason,
    href: "/dashboard/balance",
  });

  return ok({ status: "REJECTED" }, requestId);
}
