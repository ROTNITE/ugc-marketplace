import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { ClearAllNotificationsButton } from "@/components/notifications/clear-all-button";
import { MarkReadButton } from "@/components/notifications/mark-read-button";
import { Container } from "@/components/ui/container";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type FilterKey = "all" | "unread" | "payments" | "deals" | "disputes" | "system";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Все",
  unread: "Непрочитанные",
  payments: "Платежи",
  deals: "Сделки",
  disputes: "Споры",
  system: "Системные",
};

function getCategory(type: string): FilterKey {
  if (type.startsWith("DISPUTE")) return "disputes";
  if (type.includes("MESSAGE")) return "deals";
  if (type.includes("ESCROW") || type.includes("PAYOUT") || type.includes("BALANCE")) return "payments";
  if (
    type.includes("JOB") ||
    type.includes("APPLICATION") ||
    type.includes("INVITATION") ||
    type.includes("SUBMISSION") ||
    type.includes("CHANGES") ||
    type.includes("WORK")
  ) {
    return "deals";
  }
  return "system";
}

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
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
          Этот раздел доступен только администраторам.
        </Alert>
      </Container>
    );
  }

  const basePath = "/admin/notifications";
  const rawFilter = typeof searchParams?.filter === "string" ? searchParams.filter : "all";
  const filter = Object.keys(FILTER_LABELS).includes(rawFilter) ? (rawFilter as FilterKey) : "all";
  const limit = parseLimit(searchParams ?? {});
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams ?? {}));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);
  const where = {
    userId: user.id,
    ...(cursorWhere ? { AND: [cursorWhere] } : {}),
  };

  const result = await prisma.notification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      title: true,
      body: true,
      href: true,
      type: true,
      isRead: true,
      createdAt: true,
    },
  });

  const paged = sliceWithNextCursor(result, limit, (item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
  }));
  const notifications = paged.items;
  const nextCursor = paged.nextCursor;

  const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
  const unreadIdSet = new Set(unreadIds);
  if (unreadIds.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: user.id, id: { in: unreadIds } },
      data: { isRead: true },
    });
  }

  const resolvedNotifications = unreadIds.length
    ? notifications.map((item) => (unreadIdSet.has(item.id) ? { ...item, isRead: true } : item))
    : notifications;

  const counts: Record<FilterKey, number> = {
    all: resolvedNotifications.length,
    unread: resolvedNotifications.filter((item) => !item.isRead).length,
    payments: 0,
    deals: 0,
    disputes: 0,
    system: 0,
  };

  for (const item of resolvedNotifications) {
    const category = getCategory(item.type);
    counts[category] += 1;
  }

  const filteredNotifications =
    filter === "all"
      ? resolvedNotifications
      : filter === "unread"
        ? resolvedNotifications.filter((item) => !item.isRead)
        : resolvedNotifications.filter((item) => getCategory(item.type) === filter);

  const nextParams = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => nextParams.append(key, item));
        return;
      }
      if (value !== undefined) {
        nextParams.set(key, value);
      }
    });
  }
  if (nextCursor) {
    nextParams.set("cursor", nextCursor);
    nextParams.set("limit", String(limit));
  }

  return (
    <Container size="lg" className="py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
            В админку
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Уведомления</h1>
          <p className="text-sm text-muted-foreground">Последние 200 событий в системе.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MarkAllReadButton />
          <ClearAllNotificationsButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Переключайтесь между категориями.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(FILTER_LABELS).map(([key, label]) => (
            <Link
              key={key}
              className={`rounded-md border px-3 py-1 text-sm transition ${
                key === filter
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              href={`${basePath}?filter=${key}`}
            >
              {label} ({counts[key as FilterKey]})
            </Link>
          ))}
        </CardContent>
      </Card>

      {filteredNotifications.length === 0 ? (
        <EmptyState title="Пока пусто" description="Уведомлений нет." />
      ) : (
        <>
          <div className="grid gap-3">
            {filteredNotifications.map((item) => {
              const category = getCategory(item.type);
              return (
                <Card key={item.id} className={item.isRead ? "opacity-80" : "border-primary/50"}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        <Link className="hover:underline" href={`/api/notifications/${item.id}/open`}>
                          {item.title}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="soft">{category.toUpperCase()}</Badge>
                      <Badge variant="soft">{item.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {item.body ? <p className="whitespace-pre-wrap">{item.body}</p> : null}
                    <div className="flex flex-wrap items-center gap-3">
                      <Link className="text-primary hover:underline" href={`/api/notifications/${item.id}/open`}>
                        Перейти
                      </Link>
                      {!item.isRead ? <MarkReadButton notificationId={item.id} /> : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`${basePath}?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
