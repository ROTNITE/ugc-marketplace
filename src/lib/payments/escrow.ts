import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform-settings";
import { computeCommission, computeCreatorPayout, convertCents } from "@/lib/payments";

export type EscrowActionSource = "CANCEL" | "DISPUTE" | "REVIEW";

type TransactionClient = Prisma.TransactionClient;

type ReleaseResult =
  | {
      status: "released";
      escrowId: string;
      payoutCents: number;
      payoutCurrency: string;
      commissionCents: number;
    }
  | { status: "already_released"; escrowId: string }
  | { status: "unfunded"; escrowId: string }
  | { status: "refunded"; escrowId: string }
  | { status: "missing" }
  | { status: "no_active_creator"; escrowId: string }
  | { status: "job_not_found" };

type RefundResult =
  | { status: "refunded"; escrowId: string; amountCents: number; currency: string; ledgerId: string | null }
  | { status: "already_refunded"; escrowId: string }
  | { status: "unfunded"; escrowId: string }
  | { status: "released"; escrowId: string }
  | { status: "missing" }
  | { status: "job_not_found" };

async function safeCreateOutbox(
  tx: TransactionClient,
  type: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await tx.outboxEvent.create({ data: { type, payload } });
  } catch (error) {
    console.error("[payments] outbox insert failed", { type, error });
  }
}

async function safeCreateNotification(
  tx: TransactionClient,
  data: { userId: string; type: string; title: string; body?: string | null; href?: string | null },
): Promise<void> {
  try {
    await tx.notification.create({ data });
  } catch (error) {
    console.error("[payments] notification insert failed", { type: data.type, error });
  }
}

export async function releaseEscrowForJob({
  jobId,
  actorUserId,
  source,
  tx,
}: {
  jobId: string;
  actorUserId: string;
  source: EscrowActionSource;
  tx?: TransactionClient;
}): Promise<ReleaseResult> {
  const settings = await getPlatformSettings();

  const runner = async (client: TransactionClient): Promise<ReleaseResult> => {
    const job = await client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        brandId: true,
        activeCreatorId: true,
        escrow: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            currency: true,
          },
        },
      },
    });

    if (!job) return { status: "job_not_found" };

    const escrow = job.escrow;
    if (!escrow) return { status: "missing" };
    if (escrow.status === "RELEASED") return { status: "already_released", escrowId: escrow.id };
    if (escrow.status === "REFUNDED") return { status: "refunded", escrowId: escrow.id };
    if (escrow.status !== "FUNDED") return { status: "unfunded", escrowId: escrow.id };
    if (!job.activeCreatorId) return { status: "no_active_creator", escrowId: escrow.id };

    const releaseReference = `ESCROW_RELEASE:${escrow.id}`;
    const existingRelease = await client.ledgerEntry.findFirst({
      where: { reference: releaseReference },
      select: { id: true },
    });
    if (existingRelease) {
      await client.escrow.updateMany({
        where: { id: escrow.id, status: "FUNDED" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      return { status: "already_released", escrowId: escrow.id };
    }

    const commissionCents = computeCommission(escrow.amountCents, settings.commissionBps);
    const payoutCentsEscrow = computeCreatorPayout(escrow.amountCents, settings.commissionBps);

    const adminUser = await client.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
    const wallet = await client.wallet.findUnique({
      where: { userId: job.activeCreatorId },
      select: { currency: true },
    });
    const creatorProfile = await client.creatorProfile.findUnique({
      where: { userId: job.activeCreatorId },
      select: { currency: true },
    });
    const payoutCurrency = wallet?.currency ?? creatorProfile?.currency ?? escrow.currency;
    const payoutCents = convertCents(payoutCentsEscrow, escrow.currency, payoutCurrency);

    const now = new Date();
    const updated = await client.escrow.updateMany({
      where: { id: escrow.id, status: "FUNDED" },
      data: { status: "RELEASED", releasedAt: now },
    });

    if (updated.count === 0) {
      const latest = await client.escrow.findUnique({ where: { id: escrow.id }, select: { status: true } });
      if (latest?.status === "RELEASED") return { status: "already_released", escrowId: escrow.id };
      if (latest?.status === "REFUNDED") return { status: "refunded", escrowId: escrow.id };
      return { status: "unfunded", escrowId: escrow.id };
    }

    if (commissionCents > 0) {
      await client.ledgerEntry.create({
        data: {
          type: "COMMISSION_TAKEN",
          amountCents: commissionCents,
          currency: escrow.currency,
          fromUserId: job.brandId,
          toUserId: adminUser?.id ?? null,
          escrowId: escrow.id,
          reference: `ESCROW_COMMISSION:${escrow.id}`,
          metadata: { source, actorUserId },
        },
      });
    }

    if (payoutCents > 0) {
      await client.ledgerEntry.create({
        data: {
          type: "ESCROW_RELEASED",
          amountCents: payoutCents,
          currency: payoutCurrency,
          fromUserId: job.brandId,
          toUserId: job.activeCreatorId,
          escrowId: escrow.id,
          reference: releaseReference,
          metadata: { source, actorUserId },
        },
      });

      await client.wallet.upsert({
        where: { userId: job.activeCreatorId },
        update: { balanceCents: { increment: payoutCents }, currency: payoutCurrency },
        create: { userId: job.activeCreatorId, balanceCents: payoutCents, currency: payoutCurrency },
      });
    }

    await safeCreateOutbox(client, "ESCROW_RELEASED", {
      jobId: job.id,
      escrowId: escrow.id,
      amountCents: payoutCents,
      currency: payoutCurrency,
      source,
      actorUserId,
    });

    await safeCreateNotification(client, {
      userId: job.activeCreatorId,
      type: "ESCROW_RELEASED",
      title: "Оплата начислена на баланс",
      body: job.title,
      href: `/dashboard/work/${job.id}`,
    });

    return {
      status: "released",
      escrowId: escrow.id,
      payoutCents,
      payoutCurrency,
      commissionCents,
    };
  };

  if (tx) {
    return runner(tx);
  }

  return prisma.$transaction(runner);
}

export async function refundEscrowForJob({
  jobId,
  actorUserId,
  reason,
  source,
  tx,
}: {
  jobId: string;
  actorUserId: string;
  reason?: string | null;
  source: EscrowActionSource;
  tx?: TransactionClient;
}): Promise<RefundResult> {
  const runner = async (client: TransactionClient): Promise<RefundResult> => {
    const job = await client.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        brandId: true,
        escrow: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            currency: true,
          },
        },
      },
    });

    if (!job) return { status: "job_not_found" };

    const escrow = job.escrow;
    if (!escrow) return { status: "missing" };
    if (escrow.status === "REFUNDED") return { status: "already_refunded", escrowId: escrow.id };
    if (escrow.status === "RELEASED") return { status: "released", escrowId: escrow.id };
    if (escrow.status !== "FUNDED") return { status: "unfunded", escrowId: escrow.id };

    const refundReference = `ESCROW_REFUND:${escrow.id}`;
    const existingRefund = await client.ledgerEntry.findFirst({
      where: { reference: refundReference },
      select: { id: true },
    });
    if (existingRefund) {
      await client.escrow.updateMany({
        where: { id: escrow.id, status: "FUNDED" },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
      return { status: "already_refunded", escrowId: escrow.id };
    }

    const now = new Date();
    const updated = await client.escrow.updateMany({
      where: { id: escrow.id, status: "FUNDED" },
      data: { status: "REFUNDED", refundedAt: now },
    });

    if (updated.count === 0) {
      const latest = await client.escrow.findUnique({ where: { id: escrow.id }, select: { status: true } });
      if (latest?.status === "REFUNDED") return { status: "already_refunded", escrowId: escrow.id };
      if (latest?.status === "RELEASED") return { status: "released", escrowId: escrow.id };
      return { status: "unfunded", escrowId: escrow.id };
    }

    const ledger = await client.ledgerEntry.create({
      data: {
        type: "ESCROW_REFUNDED",
        amountCents: escrow.amountCents,
        currency: escrow.currency,
        toUserId: job.brandId,
        escrowId: escrow.id,
        reference: refundReference,
        metadata: { source, actorUserId, reason: reason ?? null },
      },
      select: { id: true },
    });

    await safeCreateOutbox(client, "ESCROW_REFUNDED", {
      jobId: job.id,
      escrowId: escrow.id,
      amountCents: escrow.amountCents,
      currency: escrow.currency,
      source,
      actorUserId,
      ledgerId: ledger.id,
    });

    await safeCreateNotification(client, {
      userId: job.brandId,
      type: "ESCROW_REFUNDED",
      title: "Эскроу возвращён",
      body: job.title,
      href: `/dashboard/jobs/${job.id}`,
    });

    return {
      status: "refunded",
      escrowId: escrow.id,
      amountCents: escrow.amountCents,
      currency: escrow.currency,
      ledgerId: ledger.id,
    };
  };

  if (tx) {
    return runner(tx);
  }

  return prisma.$transaction(runner);
}
