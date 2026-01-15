import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
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

  const rawType = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const processedFilter = typeof searchParams.processed === "string" ? searchParams.processed : undefined;
  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const distinctTypes = await prisma.outboxEvent.findMany({
    distinct: ["type"],
    select: { type: true },
    orderBy: { type: "asc" },
    take: 200,
  });

  const where: Prisma.OutboxEventWhereInput = {};
  if (rawType) where.type = rawType;
  if (processedFilter === "processed") where.processedAt = { not: null };
  if (processedFilter === "unprocessed") where.processedAt = null;
  const cursorWhere = buildCreatedAtCursorWhere(cursor);
  if (cursorWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
  }

  const result = await prisma.outboxEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      type: true,
      payload: true,
      createdAt: true,
      processedAt: true,
    },
  });

  const paged = sliceWithNextCursor(result, limit, (event) => ({
    id: event.id,
    createdAt: event.createdAt.toISOString(),
  }));
  const events = paged.items;
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="События"
          description="События из outbox с фильтрами и пагинацией."
          eyebrow={
            <Link className="hover:text-foreground" href="/admin">
              Назад в админку
            </Link>
          }
        />
        <form className="flex items-center gap-2 flex-wrap" action="/admin/events" method="get">
          <label className="text-sm text-muted-foreground" htmlFor="type">
            Тип
          </label>
          <select
            id="type"
            name="type"
            defaultValue={rawType ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Все</option>
            {distinctTypes.map((item) => (
              <option key={item.type} value={item.type}>
                {item.type}
              </option>
            ))}
          </select>
          <label className="text-sm text-muted-foreground" htmlFor="processed">
            Статус
          </label>
          <select
            id="processed"
            name="processed"
            defaultValue={processedFilter ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Все</option>
            <option value="unprocessed">Не обработано</option>
            <option value="processed">Обработано</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-border bg-muted px-3 py-2 text-sm hover:bg-muted/80"
          >
            Применить
          </button>
        </form>
      </div>

      {events.length === 0 ? (
        <EmptyState title="Нет событий" description="Пока ничего не записано." />
      ) : (
        <>
          <div className="grid gap-3">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{event.type}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {event.createdAt.toISOString()}
                    </p>
                    {event.processedAt ? (
                      <p className="text-xs text-muted-foreground">
                        processed: {event.processedAt.toISOString()}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">processed: -</p>
                    )}
                  </div>
                  <Badge variant="soft">#{event.id.slice(0, 8)}</Badge>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`/admin/events?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
