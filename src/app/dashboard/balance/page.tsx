import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_LABELS } from "@/lib/constants";
import { PayoutRequestForm } from "@/components/payouts/payout-request-form";
import { PayoutCancelButton } from "@/components/payouts/payout-cancel-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPayoutStatusBadge, getRoleBadge } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

const LEDGER_LABELS: Record<string, string> = {
  ESCROW_FUNDED: "Эскроу пополнен",
  ESCROW_RELEASED: "Выплата креатору",
  COMMISSION_TAKEN: "Комиссия платформы",
  PAYOUT_REQUESTED: "Заявка на выплату",
  PAYOUT_APPROVED: "Выплата подтверждена",
  PAYOUT_REJECTED: "Выплата отклонена",
  MANUAL_ADJUSTMENT: "Корректировка баланса",
};

function formatMoney(amountCents: number, currency: string) {
  const value = Math.round(amountCents / 100);
  const label = (CURRENCY_LABELS as Record<string, string>)[currency] ?? currency;
  return `${value} ${label}`;
}

export default async function BalancePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </div>
    );
  }

  if (user.role !== "CREATOR") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Только для креаторов">
          Баланс доступен только аккаунтам креаторов.
        </Alert>
      </div>
    );
  }

  const [wallet, ledgerEntries, payoutRequests] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.ledgerEntry.findMany({
      where: {
        OR: [{ fromUserId: user.id }, { toUserId: user.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payoutRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const balanceCents = wallet?.balanceCents ?? 0;
  const currency = wallet?.currency ?? "RUB";
  const currencyLabel = (CURRENCY_LABELS as Record<string, string>)[currency] ?? currency;
  const roleBadge = getRoleBadge("CREATOR");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <PageHeader
        title="Баланс"
        description="Отслеживайте выплаты и заявки."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard">
            Назад в кабинет
          </Link>
        }
        actions={
          <Badge variant={roleBadge.variant} tone={roleBadge.tone}>
            {roleBadge.label}
          </Badge>
        }
      />

      <SectionCard title="Текущий баланс" description="Доступно к выводу">
        <div className="text-3xl font-semibold">
          {formatMoney(balanceCents, currency)}
        </div>
      </SectionCard>

      <SectionCard title="Запросить выплату" description="Укажите сумму и способ получения.">
        <PayoutRequestForm maxAmountCents={balanceCents} currencyLabel={currencyLabel} />
      </SectionCard>

      <SectionCard title="История операций" description="Последние 20 движений по балансу.">
        {ledgerEntries.length === 0 ? (
          <EmptyState
            title="Пока нет операций"
            description="После первых выплат здесь появится история."
          />
        ) : (
          <div className="space-y-3 text-sm">
            {ledgerEntries.map((entry) => {
              const isIncoming = entry.toUserId === user.id;
              return (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div>
                    <div className="font-medium text-foreground">{LEDGER_LABELS[entry.type] ?? entry.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(entry.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                    </div>
                  </div>
                  <div className={isIncoming ? "text-success" : "text-danger"}>
                    {isIncoming ? "+" : "-"} {formatMoney(entry.amountCents, entry.currency)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Заявки на выплату" description="Последние 20 заявок.">
        {payoutRequests.length === 0 ? (
          <EmptyState
            title="Заявок нет"
            description="Когда вы запросите выплату, она появится здесь."
          />
        ) : (
          <div className="space-y-3 text-sm">
            {payoutRequests.map((request) => {
              const payoutBadge = getPayoutStatusBadge(request.status);
              return (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {formatMoney(request.amountCents, request.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(request.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                    </div>
                    {request.reason ? (
                      <div className="text-xs text-danger">Причина: {request.reason}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={payoutBadge.variant} tone={payoutBadge.tone}>
                      {payoutBadge.label}
                    </Badge>
                    {request.status === "PENDING" ? <PayoutCancelButton payoutId={request.id} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
