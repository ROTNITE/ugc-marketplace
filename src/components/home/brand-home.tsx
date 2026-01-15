import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function BrandHome({
  userId,
  brandProfileId,
}: {
  userId: string;
  brandProfileId?: string | null;
}) {
  const brandIds = [userId, brandProfileId].filter(Boolean) as string[];
  const [pendingModerationCount, inReviewCount, unreadCount] = await Promise.all([
    prisma.job.count({ where: { brandId: { in: brandIds }, moderationStatus: "PENDING" } }),
    prisma.job.count({ where: { brandId: { in: brandIds }, status: "IN_REVIEW" } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Главная</h1>
        <p className="text-sm text-muted-foreground">Быстрые действия для бренда.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Создать заказ</CardTitle>
            <CardDescription>Новый бриф и публикация</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/dashboard/jobs/new">
              Создать
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сделки</CardTitle>
            <CardDescription>Заказы, отклики и приёмка</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/dashboard/deals">
              Открыть
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Креаторы</CardTitle>
            <CardDescription>Каталог исполнителей</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/creators">
              Открыть каталог
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
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">На модерации</div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            {pendingModerationCount}
            <Badge variant="soft">PENDING</Badge>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">На проверке</div>
          <div className="text-lg font-semibold">{inReviewCount}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Непрочитанные уведомления</div>
          <div className="text-lg font-semibold">{unreadCount}</div>
        </div>
      </div>
    </div>
  );
}
