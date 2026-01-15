import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModerationStatus } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobModerationActions } from "@/components/admin/job-moderation-actions";

export const dynamic = "force-dynamic";

const FILTERS = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function AdminJobsPage({
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
  const filter = FILTERS.includes(rawFilter as ModerationStatus)
    ? (rawFilter as ModerationStatus)
    : ModerationStatus.PENDING;

  const jobs = await prisma.job.findMany({
    where: { moderationStatus: filter },
    include: {
      brand: { include: { brandProfile: true } },
      moderatedByUser: { select: { id: true, name: true, email: true } },
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
        <h1 className="text-2xl font-semibold tracking-tight">Модерация заказов</h1>
        <p className="text-sm text-muted-foreground">Проверяйте публикации перед выдачей в ленту.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Статус модерации</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Link
              key={item}
              className={`rounded-md border px-3 py-1 text-sm transition ${
                item === filter ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              href={`/admin/jobs?status=${item}`}
            >
              {item}
            </Link>
          ))}
        </CardContent>
      </Card>

      {jobs.length === 0 ? (
        <Alert variant="info" title="Пока нет заказов">
          Нет заказов в этом статусе.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const brandName =
              job.brand.brandProfile?.companyName ?? job.brand.name ?? job.brand.email ?? "Бренд";
            const createdAt = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true, locale: ru });
            const moderatedAt = job.moderatedAt
              ? formatDistanceToNow(new Date(job.moderatedAt), { addSuffix: true, locale: ru })
              : null;
            return (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription>
                        {brandName} · {createdAt}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="soft">{job.status}</Badge>
                      <Badge variant="soft">{job.moderationStatus}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {job.moderatedAt ? (
                    <div className="text-muted-foreground">
                      Рассмотрено {moderatedAt}
                      {job.moderatedByUser ? ` · ${job.moderatedByUser.name ?? job.moderatedByUser.email}` : ""}
                    </div>
                  ) : null}
                  {job.moderationReason ? (
                    <div>
                      <span className="text-muted-foreground">Причина:</span>{" "}
                      <span className="text-foreground">{job.moderationReason}</span>
                    </div>
                  ) : null}
                  {job.moderationStatus === "PENDING" ? (
                    <JobModerationActions jobId={job.id} />
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
