import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModerationStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Container } from "@/components/ui/container";
import { getJobStatusBadge, getModerationStatusBadge } from "@/lib/status-badges";
import { JobModerationActions } from "@/components/admin/job-moderation-actions";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

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

  const rawFilter = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const filter = FILTERS.includes(rawFilter as ModerationStatus)
    ? (rawFilter as ModerationStatus)
    : ModerationStatus.PENDING;

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);

  const where = { moderationStatus: filter } as Prisma.JobWhereInput;
  if (cursorWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
  }

  const result = await prisma.job.findMany({
    where,
    select: {
      id: true,
      title: true,
      createdAt: true,
      status: true,
      moderationStatus: true,
      moderationReason: true,
      moderatedAt: true,
      brand: {
        select: {
          name: true,
          email: true,
          brandProfile: { select: { companyName: true } },
        },
      },
      moderatedByUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (job) => ({
    id: job.id,
    createdAt: job.createdAt.toISOString(),
  }));
  const jobs = paged.items;
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
    <Container className="py-10 space-y-6">
      <PageHeader
        title="Модерация заказов"
        description="Проверяйте публикации перед выдачей в ленту."
        eyebrow={
          <Link className="hover:text-foreground" href="/admin">
            Назад к админке
          </Link>
        }
      />

      <SectionCard title="Фильтры" description="Статус модерации">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const statusBadge = getModerationStatusBadge(item);
            return (
              <Link
                key={item}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  item === filter ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
                href={`/admin/jobs?status=${item}`}
              >
                {statusBadge.label}
              </Link>
            );
          })}
        </div>
      </SectionCard>

      {jobs.length === 0 ? (
        <EmptyState title="Пока нет заказов" description="Нет заказов в этом статусе." />
      ) : (
        <>
          <div className="grid gap-4">
            {jobs.map((job) => {
              const brandName =
                job.brand.brandProfile?.companyName ?? job.brand.name ?? job.brand.email ?? "Бренд";
              const createdAt = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true, locale: ru });
              const moderatedAt = job.moderatedAt
                ? formatDistanceToNow(new Date(job.moderatedAt), { addSuffix: true, locale: ru })
                : null;
              const jobStatusBadge = getJobStatusBadge(job.status);
              const moderationBadge = getModerationStatusBadge(job.moderationStatus);
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
                        <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                          {jobStatusBadge.label}
                        </Badge>
                        <Badge variant={moderationBadge.variant} tone={moderationBadge.tone}>
                          {moderationBadge.label}
                        </Badge>
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
          {nextCursor ? (
            <div>
              <Link href={`/admin/jobs?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
