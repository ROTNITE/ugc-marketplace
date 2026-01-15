import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";
import { Prisma } from "@prisma/client";

function toCents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

export async function notifyMatchingAlerts(jobId: string) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        platform: true,
        niche: true,
        languages: true,
        budgetMin: true,
        budgetMax: true,
      },
    });

    if (!job) return;
    if (job.status !== "PUBLISHED" || job.moderationStatus !== "APPROVED") return;

    const jobBudgetMinCents = toCents(job.budgetMin);
    const jobBudgetMaxCents = toCents(job.budgetMax);

    const alerts = await prisma.savedJobAlert.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ platform: null }, { platform: job.platform }] },
          { OR: [{ niche: null }, { niche: job.niche }] },
          { OR: [{ minBudgetCents: null }, { minBudgetCents: { lte: jobBudgetMaxCents } }] },
          { OR: [{ maxBudgetCents: null }, { maxBudgetCents: { gte: jobBudgetMinCents } }] },
        ],
      },
      select: {
        id: true,
        name: true,
        lang: true,
        creatorProfile: { select: { userId: true } },
      },
    });

    if (alerts.length === 0) return;

    const matches = alerts.filter((alert) => {
      if (!alert.lang) return true;
      return job.languages.includes(alert.lang);
    });

    if (matches.length === 0) return;

    await Promise.all(
      matches.map(async (alert) => {
        try {
          await prisma.savedJobAlertHit.create({
            data: { alertId: alert.id, jobId: job.id },
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return;
          }
          throw error;
        }

        await createNotification(alert.creatorProfile.userId, {
          type: "JOB_ALERT_MATCHED",
          title: "Новый заказ по вашему алерту",
          body: job.title,
          href: `/jobs/${job.id}`,
        }).catch(() => {});

        await emitEvent("JOB_ALERT_MATCHED", {
          jobId: job.id,
          alertId: alert.id,
          creatorUserId: alert.creatorProfile.userId,
        }).catch(() => {});
      }),
    );
  } catch (error) {
    console.error(error);
  }
}
