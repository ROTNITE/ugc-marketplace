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
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPayoutStatusBadge, getRoleBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

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

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </Container>
    );
  }

  if (user.role !== "CREATOR") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для креаторов">
          Баланс доступен только аккаунтам креаторов.
        </Alert>
      </Container>
    );
  }

  const ledgerLimit = parseLimit(searchParams, { key: "ledgerLimit", defaultLimit: 20 });
  const ledgerCursor = decodeCursor<{ createdAt: string; id: string }>(
    parseCursor(searchParams, "ledgerCursor"),
  );
  const ledgerCursorWhere = buildCreatedAtCursorWhere(ledgerCursor);

  const payoutLimit = parseLimit(searchParams, { key: "payoutLimit", defaultLimit: 20 });
  const payoutCursor = decodeCursor<{ createdAt: string; id: string }>(
    parseCursor(searchParams, "payoutCursor"),
  );
  const payoutCursorWhere = buildCreatedAtCursorWhere(payoutCursor);

  const [wallet, ledgerResult, payoutResult] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.ledgerEntry.findMany({
      where: {
        OR: [{ fromUserId: user.id }, { toUserId: user.id }],
        ...(ledgerCursorWhere ? { AND: [ledgerCursorWhere] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: ledgerLimit + 1,
    }),
    prisma.payoutRequest.findMany({
      where: {
        userId: user.id,
        ...(payoutCursorWhere ? { AND: [payoutCursorWhere] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: payoutLimit + 1,
    }),
  ]);

  const ledgerPaged = sliceWithNextCursor(ledgerResult, ledgerLimit, (entry) => ({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
  }));
  const ledgerEntries = ledgerPaged.items;
  const nextLedgerCursor = ledgerPaged.nextCursor;

  const payoutPaged = sliceWithNextCursor(payoutResult, payoutLimit, (item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
  }));
  const payoutRequests = payoutPaged.items;
  const nextPayoutCursor = payoutPaged.nextCursor;

  const baseParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => baseParams.append(key, item));
      return;
    }
    if (value !== undefined) {
      baseParams.set(key, value);
    }
  });
  const nextLedgerParams = new URLSearchParams(baseParams);
  if (nextLedgerCursor) {
    nextLedgerParams.set("ledgerCursor", nextLedgerCursor);
    nextLedgerParams.set("ledgerLimit", String(ledgerLimit));
  }
  const nextPayoutParams = new URLSearchParams(baseParams);
  if (nextPayoutCursor) {
    nextPayoutParams.set("payoutCursor", nextPayoutCursor);
    nextPayoutParams.set("payoutLimit", String(payoutLimit));
  }

  const balanceCents = wallet?.balanceCents ?? 0;
  const currency = wallet?.currency ?? "RUB";
  const currencyLabel = (CURRENCY_LABELS as Record<string, string>)[currency] ?? currency;
  const roleBadge = getRoleBadge("CREATOR");
  const pendingRequests = payoutRequests.filter((request) => request.status === "PENDING");
  const pendingAmountCents = pendingRequests.reduce((sum, request) => sum + request.amountCents, 0);
  const payoutDisabledReason = pendingRequests.length
    ? `У вас уже есть заявка на выплату (${formatMoney(pendingAmountCents, currency)}). Дождитесь решения админа.`
    : null;

  return (
    <Container size="lg" className="py-10 space-y-6">
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
        <PayoutRequestForm
          maxAmountCents={balanceCents}
          currencyLabel={currencyLabel}
          disabledReason={payoutDisabledReason}
        />
      </SectionCard>

      <SectionCard title="История операций" description="Последние движения по балансу.">
        {ledgerEntries.length === 0 ? (
          <EmptyState
            title="Пока нет операций"
            description="После первых выплат здесь появится история."
          />
        ) : (
          <>
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
            {nextLedgerCursor ? (
              <div className="pt-3">
                <Link href={`/dashboard/balance?${nextLedgerParams.toString()}`}>
                  <Button variant="outline">Показать еще</Button>
                </Link>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      <SectionCard title="Заявки на выплату" description="История ваших запросов.">
        {payoutRequests.length === 0 ? (
          <EmptyState
            title="Заявок нет"
            description="Когда вы запросите выплату, она появится здесь."
          />
        ) : (
          <>
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
            {nextPayoutCursor ? (
              <div className="pt-3">
                <Link href={`/dashboard/balance?${nextPayoutParams.toString()}`}>
                  <Button variant="outline">Показать еще</Button>
                </Link>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>
    </Container>
  );
}
