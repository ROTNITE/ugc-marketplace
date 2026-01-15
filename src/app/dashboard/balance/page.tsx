import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_LABELS } from "@/lib/constants";
import { PayoutRequestForm } from "@/components/payouts/payout-request-form";
import { PayoutCancelButton } from "@/components/payouts/payout-cancel-button";

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

const PAYOUT_STATUS_LABELS: Record<string, string> = {
  PENDING: "На рассмотрении",
  APPROVED: "Одобрено",
  REJECTED: "Отклонено",
  CANCELED: "Отменено",
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard">
            Назад в кабинет
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Баланс</h1>
          <p className="text-sm text-muted-foreground">Отслеживайте выплаты и заявки.</p>
        </div>
        <Badge variant="soft">CREATOR</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Текущий баланс</CardTitle>
          <CardDescription>Доступно к выводу</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">
            {formatMoney(balanceCents, currency)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Запросить выплату</CardTitle>
          <CardDescription>Укажите сумму и способ получения.</CardDescription>
        </CardHeader>
        <CardContent>
          <PayoutRequestForm maxAmountCents={balanceCents} currencyLabel={currencyLabel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История операций</CardTitle>
          <CardDescription>Последние 20 движений по балансу.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ledgerEntries.length === 0 ? (
            <Alert variant="info" title="Пока нет операций">
              После первых выплат здесь появится история.
            </Alert>
          ) : (
            ledgerEntries.map((entry) => {
              const isIncoming = entry.toUserId === user.id;
              return (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div>
                    <div className="font-medium text-foreground">{LEDGER_LABELS[entry.type] ?? entry.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(entry.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                    </div>
                  </div>
                  <div className={isIncoming ? "text-emerald-600" : "text-rose-600"}>
                    {isIncoming ? "+" : "-"} {formatMoney(entry.amountCents, entry.currency)}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Заявки на выплату</CardTitle>
          <CardDescription>Последние 20 заявок.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {payoutRequests.length === 0 ? (
            <Alert variant="info" title="Заявок нет">
              Когда вы запросите выплату, она появится здесь.
            </Alert>
          ) : (
            payoutRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                <div>
                  <div className="font-medium text-foreground">
                    {formatMoney(request.amountCents, request.currency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(request.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                  </div>
                  {request.reason ? (
                    <div className="text-xs text-rose-600">Причина: {request.reason}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="soft">{PAYOUT_STATUS_LABELS[request.status] ?? request.status}</Badge>
                  {request.status === "PENDING" ? <PayoutCancelButton payoutId={request.id} /> : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
