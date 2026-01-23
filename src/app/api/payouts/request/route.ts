import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { createNotification } from "@/lib/notifications";
import { getPlatformSettings } from "@/lib/platform-settings";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { ledgerReference } from "@/lib/payments/references";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    if (user.role !== "CREATOR") {
      return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
    }

    const schema = z.object({
      amountCents: z.number().int().positive(),
      payoutMethod: z.string().min(1).max(500),
    });
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;
    const amountCents = parsed.data.amountCents;
    const payoutMethod = parsed.data.payoutMethod.trim();

    if (!payoutMethod) {
      return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Укажите способ выплаты.", requestId);
    }

    const settings = await getPlatformSettings();
    const result = await prisma.$transaction(async (tx) => {
      const pending = await tx.payoutRequest.findFirst({
        where: { userId: user.id, status: "PENDING" },
        select: { id: true },
      });
      if (pending) {
        throw new Error("PAYOUT_PENDING");
      }

      const creatorProfile = await tx.creatorProfile.findUnique({
        where: { userId: user.id },
        select: { currency: true },
      });

      const wallet = await tx.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          balanceCents: 0,
          currency: creatorProfile?.currency ?? settings.defaultCurrency,
        },
      });

      const updated = await tx.wallet.updateMany({
        where: { userId: user.id, balanceCents: { gte: amountCents } },
        data: { balanceCents: { decrement: amountCents } },
      });
      if (updated.count === 0) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const payout = await tx.payoutRequest.create({
        data: {
          userId: user.id,
          amountCents,
          currency: wallet.currency,
          payoutMethod,
          status: "PENDING",
        },
      });

      await tx.ledgerEntry.create({
        data: {
          type: "PAYOUT_REQUESTED",
          amountCents,
          currency: wallet.currency,
          fromUserId: user.id,
          payoutRequestId: payout.id,
          reference: ledgerReference.payoutRequest(payout.id),
        },
      });

      return { payout };
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        createNotification(admin.id, {
          type: "PAYOUT_REQUESTED",
          title: "Новая заявка на выплату",
          body: `Сумма: ${Math.round(result.payout.amountCents / 100)}`,
          href: "/admin",
        }),
      ),
    );

    await emitEvent("PAYOUT_REQUESTED", {
      payoutRequestId: result.payout.id,
      creatorId: user.id,
      amountCents: result.payout.amountCents,
    });

    return ok({ payout: result.payout }, requestId);
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Операция уже была выполнена.", requestId);
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return fail(
        409,
        API_ERROR_CODES.PAYMENTS_STATE_ERROR,
        "Недостаточно средств на балансе.",
        requestId,
      );
    }
    if (error instanceof Error && error.message === "PAYOUT_PENDING") {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Есть незавершённая заявка на выплату.",
        requestId,
      );
    }
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
