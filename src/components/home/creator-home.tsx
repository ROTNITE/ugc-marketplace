import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isDbUnavailableError, shouldDegradeDbErrors } from "@/lib/db-errors";
import { log } from "@/lib/logger";

export async function CreatorHome({
  userId,
  creatorProfileId,
}: {
  userId: string;
  creatorProfileId?: string | null;
}) {
  const creatorIds = [userId, creatorProfileId].filter(Boolean) as string[];
  let activeWorkCount = 0;
  let invitationCount = 0;
  let unreadCount = 0;
  let dbDegraded = false;
  try {
    [activeWorkCount, invitationCount, unreadCount] = await Promise.all([
      prisma.job.count({
        where: { activeCreatorId: { in: creatorIds }, status: { in: ["PAUSED", "IN_REVIEW"] } },
      }),
      prisma.invitation.count({ where: { creatorId: { in: creatorIds }, status: "SENT" } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
  } catch (error) {
    if (shouldDegradeDbErrors() && isDbUnavailableError(error)) {
      log("warn", "db", { message: "creator-home counts fallback", error: String(error) });
      dbDegraded = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Главная</h1>
        <p className="text-sm text-muted-foreground">Быстрые действия для креатора.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Новые заказы</CardTitle>
            <CardDescription>Лента доступных задач</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/jobs">
              Открыть ленту
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сделки</CardTitle>
            <CardDescription>Приглашения, отклики и работа</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/dashboard/deals">
              Открыть
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Последние события</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/dashboard/notifications">
              Открыть
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Баланс</CardTitle>
            <CardDescription>История операций и заявки на вывод</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/dashboard/balance">
              Открыть баланс
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Активная работа</div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            {activeWorkCount}
            <Badge variant="soft" tone="warning">В работе</Badge>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Приглашения</div>
          <div className="text-lg font-semibold">{invitationCount}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Непрочитанные уведомления</div>
          <div className="text-lg font-semibold">{unreadCount}</div>
        </div>
      </div>
      {process.env.NODE_ENV === "development" && dbDegraded ? (
        <p className="text-xs text-muted-foreground">
          База недоступна, отображаются значения по умолчанию.
        </p>
      ) : null}
    </div>
  );
}
