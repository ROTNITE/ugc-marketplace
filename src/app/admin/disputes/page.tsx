import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisputeStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getDisputeStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const FILTERS: DisputeStatus[] = ["OPEN", "RESOLVED", "CANCELED"];

export default async function AdminDisputesPage({
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

  const rawFilter = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const filter = FILTERS.includes(rawFilter as DisputeStatus) ? (rawFilter as DisputeStatus) : "OPEN";

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);

  const result = await prisma.dispute.findMany({
    where: { status: filter, ...(cursorWhere ? { AND: [cursorWhere] } : {}) },
    include: {
      job: { select: { id: true, title: true, status: true } },
      openedByUser: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (dispute) => ({
    id: dispute.id,
    createdAt: dispute.createdAt.toISOString(),
  }));
  const disputes = paged.items;
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
        title="Споры"
        description="Активные и решённые конфликты по заказам."
        eyebrow={
          <Link className="hover:text-foreground" href="/admin">
            Назад к админке
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Статус спора</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const statusBadge = getDisputeStatusBadge(item);
            return (
              <Link
                key={item}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  item === filter ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
                href={`/admin/disputes?status=${item}`}
              >
                {statusBadge.label}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {disputes.length === 0 ? (
        <EmptyState title="Пока нет споров" description="В этом статусе споров нет." />
      ) : (
        <>
          <div className="grid gap-4">
            {disputes.map((dispute) => {
              const createdAt = formatDistanceToNow(dispute.createdAt, { addSuffix: true, locale: ru });
              const opener = dispute.openedByUser?.name ?? dispute.openedByUser?.email ?? dispute.openedByUser?.id;
              const statusBadge = getDisputeStatusBadge(dispute.status);
              return (
                <Card key={dispute.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>{dispute.job?.title ?? "Заказ"}</CardTitle>
                        <CardDescription>
                          {opener} · {createdAt}
                        </CardDescription>
                      </div>
                      <Badge variant={statusBadge.variant} tone={statusBadge.tone}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-muted-foreground">
                      Причина: <span className="text-foreground">{dispute.reason}</span>
                    </div>
                    <Link className="text-primary hover:underline" href={`/admin/disputes/${dispute.id}`}>
                      Открыть
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`/admin/disputes?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
