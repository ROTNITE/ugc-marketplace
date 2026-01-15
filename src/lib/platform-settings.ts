import { cache } from "react";
import { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_COMMISSION_BPS = 1500;
const DEFAULT_CURRENCY: Currency = "RUB";

function parseCommissionBps(raw?: string | null) {
  if (!raw) return DEFAULT_COMMISSION_BPS;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_COMMISSION_BPS;
  return parsed;
}

export const getPlatformSettings = cache(async () => {
  const fallback = {
    commissionBps: parseCommissionBps(process.env.COMMISSION_BPS),
    defaultCurrency: DEFAULT_CURRENCY,
  };

  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { commissionBps: true, defaultCurrency: true },
    });
    return settings ?? fallback;
  } catch (error) {
    console.error("Failed to load PlatformSettings", error);
    return fallback;
  }
});

export type PlatformSettingsSummary = Awaited<ReturnType<typeof getPlatformSettings>>;
