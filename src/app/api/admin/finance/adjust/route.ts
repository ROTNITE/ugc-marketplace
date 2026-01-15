import { z } from "zod";
import { Currency, Prisma } from "@prisma/client";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { logApiError } from "@/lib/request-id";

const schema = z.object({
  userId: z.string().uuid(),
  amountCents: z.number().int().min(-1_000_000_000).max(1_000_000_000).refine((v) => v !== 0, {
    message: "Сумма должна быть ненулевой",
  }),
  currency: z.nativeEnum(Currency),
  reason: z.string().trim().min(2).max(500),
});

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);

  try {
    await requireRole("ADMIN");
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const { userId, amountCents, currency, reason } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceCents: 0, currency },
      });

      if (amountCents < 0 && wallet.balanceCents + amountCents < 0) {
        throw new Error("NEGATIVE_BALANCE");
      }

      await tx.wallet.update({
        where: { userId },
        data: { balanceCents: { increment: amountCents }, currency },
      });

      const ledger = await tx.ledgerEntry.create({
        data: {
          type: "MANUAL_ADJUSTMENT",
          amountCents: Math.abs(amountCents),
          currency,
          toUserId: amountCents > 0 ? userId : null,
          fromUserId: amountCents < 0 ? userId : null,
          reference: `FINANCE_ADJUST:${requestId}`,
          metadata: { reason, signedAmount: amountCents },
        },
        select: { id: true, createdAt: true },
      });

      return { wallet, ledgerId: ledger.id };
    });

    await createNotification(userId, {
      type: "BALANCE_ADJUSTED",
      title: "Корректировка баланса админом",
      body: reason,
      href: "/dashboard/balance",
    });

    await emitEvent("BALANCE_ADJUSTED", {
      userId,
      amountCents,
      currency,
      reason,
      ledgerId: result.ledgerId,
    });

    return ok({ adjusted: true }, requestId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Операция уже была выполнена.", requestId);
    }
    if (error instanceof Error && error.message === "NEGATIVE_BALANCE") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Нельзя уводить баланс в минус.", requestId, {
        code: "NEGATIVE_BALANCE",
      });
    }
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/finance/adjust failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось сохранить корректировку.", requestId);
  }
}
