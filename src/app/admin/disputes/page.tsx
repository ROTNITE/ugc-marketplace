import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisputeStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getDisputeStatusBadge } from "@/lib/status-badges";

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

  const rawFilter = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const filter = FILTERS.includes(rawFilter as DisputeStatus) ? (rawFilter as DisputeStatus) : "OPEN";

  const disputes = await prisma.dispute.findMany({
    where: { status: filter },
    include: {
      job: { select: { id: true, title: true, status: true } },
      openedByUser: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
          Назад к админке
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Споры</h1>
        <p className="text-sm text-muted-foreground">Активные и решённые конфликты по заказам.</p>
      </div>

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
        <Alert variant="info" title="Пока нет споров">
          В этом статусе споров нет.
        </Alert>
      ) : (
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
      )}
    </div>
  );
}
