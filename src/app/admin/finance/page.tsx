import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FinanceAdjustForm } from "@/components/admin/finance-adjust-form";
import { CURRENCY_LABELS } from "@/lib/constants";
import { getEscrowStatusBadge, getRoleBadge } from "@/lib/status-badges";
import type { Prisma } from "@prisma/client";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import {
  buildCreatedAtCursorWhere,
  buildUpdatedAtCursorWhere,
  decodeCursor,
  parseCursor,
  parseLimit,
  sliceWithNextCursor,
} from "@/lib/pagination";

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
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </Container>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только администраторам.
        </Alert>
      </Container>
    );
  }

  const filterType = Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type;
  const filterUserId = Array.isArray(searchParams.userId) ? searchParams.userId[0] : searchParams.userId;
  const filterEscrowId = Array.isArray(searchParams.escrowId) ? searchParams.escrowId[0] : searchParams.escrowId;

  const walletLimit = parseLimit(searchParams, { key: "walletLimit" });
  const escrowLimit = parseLimit(searchParams, { key: "escrowLimit" });
  const ledgerLimit = parseLimit(searchParams, { key: "ledgerLimit" });

  const walletCursor = decodeCursor<{ updatedAt: string; id: string }>(parseCursor(searchParams, "walletCursor"));
  const escrowCursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams, "escrowCursor"));
  const ledgerCursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams, "ledgerCursor"));

  const walletWhere = buildUpdatedAtCursorWhere(walletCursor);
  const escrowWhere = buildCreatedAtCursorWhere(escrowCursor);

  const [walletResult, escrowResult] = await Promise.all([
    prisma.wallet.findMany({
      where: walletWhere ? { AND: [walletWhere] } : undefined,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: walletLimit + 1,
      include: { user: { select: { email: true, role: true, name: true } } },
    }),
    prisma.escrow.findMany({
      where: escrowWhere ? { AND: [escrowWhere] } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: escrowLimit + 1,
      include: {
        job: { select: { id: true, title: true } },
        brand: { select: { email: true, name: true } },
        creator: { select: { email: true, name: true } },
      },
    }),
  ]);

  const walletPaged = sliceWithNextCursor(walletResult, walletLimit, (wallet) => ({
    id: wallet.id,
    updatedAt: wallet.updatedAt.toISOString(),
  }));
  const escrowPaged = sliceWithNextCursor(escrowResult, escrowLimit, (escrow) => ({
    id: escrow.id,
    createdAt: escrow.createdAt.toISOString(),
  }));

  const wallets = walletPaged.items;
  const escrows = escrowPaged.items;

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
  const ledgerCursorWhere = buildCreatedAtCursorWhere(ledgerCursor);
  if (ledgerCursorWhere) {
    ledgerWhere.AND = [
      ...(Array.isArray(ledgerWhere.AND) ? ledgerWhere.AND : ledgerWhere.AND ? [ledgerWhere.AND] : []),
      ledgerCursorWhere,
    ];
  }

  const ledgerResult = await prisma.ledgerEntry.findMany({
    where: ledgerWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: ledgerLimit + 1,
  });

  const ledgerPaged = sliceWithNextCursor(ledgerResult, ledgerLimit, (entry) => ({
    id: entry.id,
    createdAt: entry.createdAt.toISOString(),
  }));
  const ledger = ledgerPaged.items;

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

  const walletParams = new URLSearchParams(baseParams);
  if (walletPaged.nextCursor) {
    walletParams.set("walletCursor", walletPaged.nextCursor);
    walletParams.set("walletLimit", String(walletLimit));
  }
  const escrowParams = new URLSearchParams(baseParams);
  if (escrowPaged.nextCursor) {
    escrowParams.set("escrowCursor", escrowPaged.nextCursor);
    escrowParams.set("escrowLimit", String(escrowLimit));
  }
  const ledgerParams = new URLSearchParams(baseParams);
  if (ledgerPaged.nextCursor) {
    ledgerParams.set("ledgerCursor", ledgerPaged.nextCursor);
    ledgerParams.set("ledgerLimit", String(ledgerLimit));
  }

  return (
    <Container className="py-10 space-y-8">
      <PageHeader
        title="Финансы"
        description="Кошельки, эскроу и журнал операций (только для админов)."
        eyebrow={
          <Link className="hover:text-foreground" href="/admin">
            Назад в админку
          </Link>
        }
      />

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
          <CardDescription>Последние обновления, с пагинацией.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {wallets.length === 0 ? (
            <EmptyState title="Нет данных" description="Кошельки будут созданы при первых операциях." />
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
          {walletPaged.nextCursor ? (
            <div>
              <Link className="text-primary hover:underline text-sm" href={`/admin/finance?${walletParams.toString()}`}>
                Показать еще
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Эскроу</CardTitle>
          <CardDescription>Последние сделки, с пагинацией.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {escrows.length === 0 ? (
            <EmptyState title="Нет эскроу" description="Появятся после принятия откликов." />
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
          {escrowPaged.nextCursor ? (
            <div>
              <Link className="text-primary hover:underline text-sm" href={`/admin/finance?${escrowParams.toString()}`}>
                Показать еще
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал операций</CardTitle>
          <CardDescription>Фильтры через строку запроса: type / userId / escrowId.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ledger.length === 0 ? (
            <EmptyState title="Записей нет" description="Создайте операции, чтобы увидеть записи." />
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
          {ledgerPaged.nextCursor ? (
            <div>
              <Link className="text-primary hover:underline text-sm" href={`/admin/finance?${ledgerParams.toString()}`}>
                Показать еще
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}
