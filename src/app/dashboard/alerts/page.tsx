import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertRowActions } from "@/components/alerts/alert-row-actions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getAlertStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import {
  buildCreatedAtCursorWhere,
  decodeCursor,
  parseCursor,
  parseLimit,
  sliceWithNextCursor,
} from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function AlertsPage({
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
          Алерты доступны только креаторам.
        </Alert>
      </Container>
    );
  }

  if (!user.creatorProfileId) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Профиль не заполнен">
          Заполните профиль, чтобы сохранять алерты.
        </Alert>
      </Container>
    );
  }

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);
  const where = {
    creatorProfileId: user.creatorProfileId,
    ...(cursorWhere ? { AND: [cursorWhere] } : {}),
  };

  const result = await prisma.savedJobAlert.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (alert) => ({
    id: alert.id,
    createdAt: alert.createdAt.toISOString(),
  }));
  const alerts = paged.items;
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
    <Container size="lg" className="py-10 space-y-6">
      <PageHeader
        title="Алерты на заказы"
        description="Здесь вы управляете сохранёнными фильтрами и уведомлениями."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/deals">
            Назад к сделкам
          </Link>
        }
      />

      {alerts.length === 0 ? (
        <EmptyState
          title="Пока нет алертов"
          description="Создайте алерт в ленте заказов."
        />
      ) : (
        <>
          <div className="grid gap-4">
            {alerts.map((alert) => {
              const statusBadge = getAlertStatusBadge(alert.isActive);
              return (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{alert.name}</CardTitle>
                        <CardDescription>{statusBadge.label}</CardDescription>
                      </div>
                      <Badge variant={statusBadge.variant} tone={statusBadge.tone}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2 text-muted-foreground">
                      {alert.platform ? <span>Платформа: {alert.platform}</span> : <span>Платформа: любая</span>}
                      {alert.niche ? <span>Ниша: {alert.niche}</span> : <span>Ниша: любая</span>}
                      {alert.lang ? <span>Язык: {alert.lang}</span> : <span>Язык: любой</span>}
                      {alert.minBudgetCents !== null ? (
                        <span>Бюджет от: {alert.minBudgetCents / 100}</span>
                      ) : (
                        <span>Бюджет от: любой</span>
                      )}
                      {alert.maxBudgetCents !== null ? (
                        <span>Бюджет до: {alert.maxBudgetCents / 100}</span>
                      ) : (
                        <span>Бюджет до: любой</span>
                      )}
                    </div>
                    <AlertRowActions alertId={alert.id} isActive={alert.isActive} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`/dashboard/alerts?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
