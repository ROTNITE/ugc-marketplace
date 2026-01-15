import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getModerationStatusBadge } from "@/lib/status-badges";

export async function AdminHome() {
  const [pendingJobs, pendingCreators, unprocessedOutbox] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PENDING" } }),
    prisma.creatorProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.outboxEvent.count({ where: { processedAt: null } }),
  ]);
  const moderationBadge = getModerationStatusBadge("PENDING");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Админ-домашняя</h1>
        <p className="text-sm text-muted-foreground">Контрольные точки админки.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Модерация заказов</CardTitle>
            <CardDescription>Проверка публикаций</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/admin/jobs?status=PENDING">
              Открыть
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Верификация креаторов</CardTitle>
            <CardDescription>Проверка профилей</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/admin/creators?status=PENDING">
              Открыть
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>События</CardTitle>
            <CardDescription>Outbox очередь</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-primary hover:underline" href="/admin/events?processed=unprocessed">
              Открыть
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Заказы на модерации</div>
          <div className="flex items-center gap-2 text-lg font-semibold">
            {pendingJobs}
            <Badge variant={moderationBadge.variant} tone={moderationBadge.tone}>
              {moderationBadge.label}
            </Badge>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Верификации</div>
          <div className="text-lg font-semibold">{pendingCreators}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-3">
          <div className="text-xs text-muted-foreground">Outbox не обработано</div>
          <div className="text-lg font-semibold">{unprocessedOutbox}</div>
        </div>
      </div>
    </div>
  );
}
