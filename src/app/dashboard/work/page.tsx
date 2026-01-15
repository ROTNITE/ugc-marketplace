import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCreatorIds } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PAUSED: "В работе",
  IN_REVIEW: "На проверке",
  COMPLETED: "Завершено",
  CANCELED: "Отменено",
};

export default async function WorkPage() {
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
          Эта страница доступна только аккаунтам креаторов.
        </Alert>
      </div>
    );
  }

  const creatorIds = getCreatorIds(user);

  const jobs = await prisma.job.findMany({
    where: {
      activeCreatorId: { in: creatorIds },
      status: { in: ["PAUSED", "IN_REVIEW"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const unreadWorkNotifications = await prisma.notification.findMany({
    where: { userId: user.id, isRead: false, href: { startsWith: "/dashboard/work/" } },
    select: { href: true },
  });
  const unreadWorkIds = new Set(
    unreadWorkNotifications
      .map((item) => item.href?.split("/").pop())
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/deals">
          ← К сделкам
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Работа</h1>
        <p className="text-sm text-muted-foreground">Активные заказы, где вы исполнитель.</p>
      </div>

      {!user.creatorProfileId ? (
        <Alert variant="info" title="Профиль креатора не заполнен">
          Заполните профиль, чтобы бренды могли выбрать вас.
        </Alert>
      ) : null}

      {jobs.length === 0 ? (
        <Alert variant="info" title="Пока нет активных заказов">
          Дождитесь принятия отклика брендом или откликнитесь на новые заказы.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const isUnread = unreadWorkIds.has(job.id);
            return (
            <Card key={job.id} className={isUnread ? "border-primary/50 bg-primary/5" : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription>
                      Дедлайн:{" "}
                      {job.deadlineType === "DATE" && job.deadlineDate
                        ? format(job.deadlineDate, "dd.MM.yyyy")
                        : job.deadlineType}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUnread ? <Badge variant="soft">Новое</Badge> : null}
                    <Badge variant="soft">{STATUS_LABELS[job.status] ?? job.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 text-sm">
                <div className="text-muted-foreground">
                  Обновлено: {format(job.updatedAt, "dd.MM.yyyy HH:mm")}
                </div>
                <Link className="text-primary hover:underline" href={`/dashboard/work/${job.id}`}>
                  Открыть
                </Link>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}
