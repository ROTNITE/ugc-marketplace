import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { requireAdmin } from "@/lib/authz";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return fail(401, API_ERROR_CODES.UNAUTHORIZED, "Требуется авторизация.", requestId);
  }
  const authz = await requireAdmin(user).catch((error) => {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return { errorResponse: mapped };
    return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
  });
  if ("errorResponse" in authz) return authz.errorResponse;

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
        data: { status: "APPROVED" },
      });
      if (updated.count === 0) {
        throw new Error("INVALID_STATUS");
      }

      await tx.ledgerEntry.create({
        data: {
          type: "PAYOUT_APPROVED",
          amountCents: payout.amountCents,
          currency: payout.currency,
          toUserId: payout.userId,
          payoutRequestId: payout.id,
          reference: `PAYOUT_APPROVE:${payout.id}`,
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

  await emitEvent("PAYOUT_APPROVED", {
    creatorId: payout.userId,
    amountCents: payout.amountCents,
    payoutMethod: payout.payoutMethod,
  });

  await createNotification(payout.userId, {
    type: "PAYOUT_APPROVED",
    title: "Выплата подтверждена (в обработке)",
    body: payout.payoutMethod ?? undefined,
    href: "/dashboard/balance",
  });

  return ok({ status: "APPROVED" }, requestId);
}
