import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { ClearAllNotificationsButton } from "@/components/notifications/clear-all-button";
import { MarkReadButton } from "@/components/notifications/mark-read-button";

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

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
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

  const rawFilter = typeof searchParams?.filter === "string" ? searchParams.filter : "all";
  const filter = Object.keys(FILTER_LABELS).includes(rawFilter) ? (rawFilter as FilterKey) : "all";

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const shouldMarkRead = notifications.some((item) => !item.isRead);
  if (shouldMarkRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
  }

  const resolvedNotifications = shouldMarkRead
    ? notifications.map((item) => ({ ...item, isRead: true }))
    : notifications;

  const backHref = user.role === "ADMIN" ? "/admin" : "/dashboard";

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href={backHref}>
            {user.role === "ADMIN" ? "В админку" : "В кабинет"}
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
              href={`/dashboard/notifications?filter=${key}`}
            >
              {label} ({counts[key as FilterKey]})
            </Link>
          ))}
        </CardContent>
      </Card>

      {filteredNotifications.length === 0 ? (
        <Alert variant="info" title="Пока пусто">
          Уведомлений нет.
        </Alert>
      ) : (
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
      )}
    </div>
  );
}
