import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FinanceAdjustForm } from "@/components/admin/finance-adjust-form";
import { CURRENCY_LABELS } from "@/lib/constants";
import { getEscrowStatusBadge, getRoleBadge } from "@/lib/status-badges";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
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

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только администраторам.
        </Alert>
      </div>
    );
  }

  const filterType = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type;
  const filterUserId = Array.isArray(searchParams.userId) ? searchParams.userId[0] : searchParams.userId;
  const filterEscrowId = Array.isArray(searchParams.escrowId) ? searchParams.escrowId[0] : searchParams.escrowId;

  const [wallets, escrows] = await Promise.all([
    prisma.wallet.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { email: true, role: true, name: true } } },
    }),
    prisma.escrow.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        job: { select: { id: true, title: true } },
        brand: { select: { email: true, name: true } },
        creator: { select: { email: true, name: true } },
      },
    }),
  ]);

  const ledgerWhere: Prisma.LedgerEntryWhereInput = {};
  if (filterType && typeof filterType === "string") {
    ledgerWhere.type = filterType as Prisma.LedgerEntryWhereInput["type"];
  }
  const orConditions: Prisma.LedgerEntryWhereInput[] = [];
  if (filterUserId) {
    orConditions.push({ toUserId: filterUserId }, { fromUserId: filterUserId });
  }
  if (filterEscrowId) {
    orConditions.push({ escrowId: filterEscrowId });
  }
  if (orConditions.length) {
    ledgerWhere.OR = orConditions;
  }

  const ledger = await prisma.ledgerEntry.findMany({
    where: ledgerWhere,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
          Назад в админку
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Финансы</h1>
        <p className="text-sm text-muted-foreground">Кошельки, эскроу и журнал операций (только для админов).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Корректировка баланса</CardTitle>
          <CardDescription>Применяйте начисления/списания с журналом.</CardDescription>
        </CardHeader>
        <CardContent>
          <FinanceAdjustForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Кошельки</CardTitle>
          <CardDescription>Первые 100 по дате обновления.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {wallets.length === 0 ? (
            <Alert variant="info" title="Нет данных">Кошельки будут созданы при первых операциях.</Alert>
          ) : (
            wallets.map((wallet) => {
              const roleBadge = getRoleBadge(wallet.user.role);
              return (
                <div key={wallet.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {wallet.user.name || wallet.user.email || "Пользователь"} ({roleBadge.label})
                    </div>
                    <div className="text-xs text-muted-foreground">{wallet.user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="soft">{wallet.currency}</Badge>
                    <span className="font-medium">
                      {Math.round(wallet.balanceCents / 100)} {CURRENCY_LABELS[wallet.currency] ?? wallet.currency}
                    </span>
                    <Link className="text-primary hover:underline text-xs" href={`/admin/finance?userId=${wallet.userId}`}>
                      Журнал
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Эскроу</CardTitle>
          <CardDescription>Первые 100 по дате создания.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {escrows.length === 0 ? (
            <Alert variant="info" title="Нет эскроу">Появятся после принятия откликов.</Alert>
          ) : (
            escrows.map((escrow) => {
              const escrowBadge = getEscrowStatusBadge(escrow.status);
              return (
                <div key={escrow.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/60 p-3">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">
                      Заказ:{" "}
                      <Link className="text-primary hover:underline" href={`/jobs/${escrow.jobId}`}>
                        {escrow.job?.title ?? escrow.jobId}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Бренд: {escrow.brand?.email ?? "-"} · Креатор: {escrow.creator?.email ?? "-"}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <Badge variant={escrowBadge.variant} tone={escrowBadge.tone}>
                        {escrowBadge.label}
                      </Badge>
                      <Badge variant="soft">{escrow.currency}</Badge>
                    </div>
                    <div className="font-medium">
                      {Math.round(escrow.amountCents / 100)} {CURRENCY_LABELS[escrow.currency] ?? escrow.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Пополнен: {escrow.fundedAt ? formatDistanceToNow(escrow.fundedAt, { addSuffix: true, locale: ru }) : "-"} ·
                      Выплачен:{" "}
                      {escrow.releasedAt ? formatDistanceToNow(escrow.releasedAt, { addSuffix: true, locale: ru }) : "-"} ·
                      Возврат:{" "}
                      {escrow.refundedAt ? formatDistanceToNow(escrow.refundedAt, { addSuffix: true, locale: ru }) : "-"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал операций</CardTitle>
          <CardDescription>Фильтры через строку запроса: type / userId / escrowId.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ledger.length === 0 ? (
            <Alert variant="info" title="Записей нет">Создайте операции, чтобы увидеть записи.</Alert>
          ) : (
            ledger.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/60 p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="soft">{entry.type}</Badge>
                    <Badge variant="soft">{entry.currency}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: ru })}
                  </div>
                  {entry.metadata ? (
                    <div className="text-xs text-muted-foreground break-all">
                      {JSON.stringify(entry.metadata)}
                    </div>
                  ) : null}
                </div>
                <div className="text-right space-y-1">
                  <div className="font-medium">{entry.amountCents / 100}</div>
                  <div className="text-xs text-muted-foreground">От: {entry.fromUserId ?? "-"} · Кому: {entry.toUserId ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">Эскроу: {entry.escrowId ?? "-"}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
