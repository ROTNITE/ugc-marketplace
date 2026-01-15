import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_LABELS } from "@/lib/constants";
import { AdminPayoutActions } from "@/components/payouts/admin-payout-actions";
import { getPayoutStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "CANCELED"] as const;

function truncate(value: string | null | undefined, max = 60) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default async function AdminPayoutsPage({
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

  const statusParam = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const status = STATUS_OPTIONS.includes(statusParam as typeof STATUS_OPTIONS[number])
    ? (statusParam as typeof STATUS_OPTIONS[number])
    : "PENDING";

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);

  const where = { status } as Prisma.PayoutRequestWhereInput;
  if (cursorWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
  }

  const result = await prisma.payoutRequest.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      amountCents: true,
      currency: true,
      payoutMethod: true,
      status: true,
      reason: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (payout) => ({
    id: payout.id,
    createdAt: payout.createdAt.toISOString(),
  }));
  const payouts = paged.items;
  const nextCursor = paged.nextCursor;

  const nextParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
      return;
    }
    if (value !== undefined) {
      nextParams.set(key, value);
    }
  });
  if (nextCursor) {
    nextParams.set("cursor", nextCursor);
    nextParams.set("limit", String(limit));
  }

  return (
    <Container className="py-10 space-y-6">
      <PageHeader
        title="Выплаты"
        description="Обработка заявок на вывод средств."
        eyebrow={
          <Link className="hover:text-foreground" href="/admin">
            Назад в админку
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((item) => {
          const badge = getPayoutStatusBadge(item);
          return (
            <Link
              key={item}
              className={`rounded-md border px-3 py-2 text-sm ${
                item === status ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              href={`/admin/payouts?status=${item}`}
            >
              {badge.label}
            </Link>
          );
        })}
      </div>

      {payouts.length === 0 ? (
        <EmptyState title="Пока пусто" description="Нет заявок с выбранным статусом." />
      ) : (
        <>
          <div className="grid gap-4">
            {payouts.map((payout) => {
              const creatorName = payout.user.name || payout.user.email || "Креатор";
              const currencyLabel = CURRENCY_LABELS[payout.currency] ?? payout.currency;
              const statusBadge = getPayoutStatusBadge(payout.status);
              return (
                <Card key={payout.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>{creatorName}</CardTitle>
                        <CardDescription>
                          {Math.round(payout.amountCents / 100)} {currencyLabel} ·{" "}
                          {format(payout.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                        </CardDescription>
                      </div>
                      <Badge variant={statusBadge.variant} tone={statusBadge.tone}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="text-muted-foreground">Метод: {truncate(payout.payoutMethod, 80)}</div>
                    {payout.reason ? (
                      <div className="text-danger text-xs">Причина: {payout.reason}</div>
                    ) : null}
                    {payout.status === "PENDING" ? (
                      <AdminPayoutActions payoutId={payout.id} />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`/admin/payouts?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}

