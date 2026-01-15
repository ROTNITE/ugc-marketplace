import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const rawType = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const processedFilter = typeof searchParams.processed === "string" ? searchParams.processed : undefined;
  const distinctTypes = await prisma.outboxEvent.findMany({
    distinct: ["type"],
    select: { type: true },
    orderBy: { type: "asc" },
  });

  const where: Prisma.OutboxEventWhereInput = {};
  if (rawType) where.type = rawType;
  if (processedFilter === "processed") where.processedAt = { not: null };
  if (processedFilter === "unprocessed") where.processedAt = null;

  const events = await prisma.outboxEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
            Назад в админку
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">События</h1>
          <p className="text-sm text-muted-foreground">Последние записи из outbox (до 200 шт.).</p>
        </div>
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
        <Alert variant="info" title="Нет событий">
          Пока ничего не записано.
        </Alert>
      ) : (
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
                    <p className="text-xs text-muted-foreground">processed: —</p>
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
      )}
    </div>
  );
}
