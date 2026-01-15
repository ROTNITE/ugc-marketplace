import { Currency } from "@prisma/client";

const DEFAULT_COMMISSION_BPS = 1500;

const FX_RUB_RATES: Record<Currency, number> = {
  RUB: 1,
  USD: 90,
  EUR: 98,
  KZT: 0.2,
  UAH: 2.4,
  BYN: 30,
};

export function getCommissionBps(): number {
  const raw = process.env.COMMISSION_BPS;
  if (!raw) return DEFAULT_COMMISSION_BPS;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_COMMISSION_BPS;

  return parsed;
}

export function computeCommission(amountCents: number, commissionBps: number = getCommissionBps()): number {
  const bps = Math.max(0, Math.min(commissionBps, 10000));
  const commission = Math.round((amountCents * bps) / 10000);
  return Math.min(Math.max(commission, 0), amountCents);
}

export function computeCreatorPayout(amountCents: number, commissionBps?: number): number {
  const commission = computeCommission(amountCents, commissionBps);
  return Math.max(0, amountCents - commission);
}

export function convertCents(amountCents: number, from: Currency, to: Currency): number {
  if (from === to) return amountCents;
  const fromRate = FX_RUB_RATES[from] ?? 1;
  const toRate = FX_RUB_RATES[to] ?? 1;
  const amountInRub = (amountCents / 100) * fromRate;
  const converted = (amountInRub / toRate) * 100;
  return Math.round(converted);
}
