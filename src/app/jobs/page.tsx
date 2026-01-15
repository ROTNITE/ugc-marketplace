import { prisma } from "@/lib/prisma";
import { JobFilters } from "@/components/jobs/job-filters";
import Link from "next/link";
import { JobCard, type JobListItem } from "@/components/jobs/job-card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { parseJobListFilters, buildJobWhere, buildJobOrderBy, buildJobCursorWhere, type JobCursor } from "@/lib/jobs/filters";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { JobAlertCreator } from "@/components/jobs/job-alert-creator";
import { decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseJobListFilters(searchParams);
  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<JobCursor>(parseCursor(searchParams));
  const session = await getServerSession(authOptions);
  const user = session?.user;

  let jobs: JobListItem[] | null = null;
  let nextCursor: string | null = null;
  let dbError: string | null = null;

  try {
    const where = buildJobWhere(filters);
    const cursorWhere = buildJobCursorWhere(filters, cursor);
    if (cursorWhere) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
    }

    const result = await prisma.job.findMany({
      where,
      orderBy: buildJobOrderBy(filters),
      take: limit + 1,
      select: {
        id: true,
        title: true,
        description: true,
        platform: true,
        niche: true,
        rightsPackage: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        deadlineDate: true,
        deliverablesCount: true,
        createdAt: true,
      },
    });

    const paged = sliceWithNextCursor(result, limit, (job) => ({
      id: job.id,
      createdAt: job.createdAt.toISOString(),
      budgetMax: job.budgetMax,
    }));
    jobs = paged.items;
    nextCursor = paged.nextCursor;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("DATABASE_URL")) {
      dbError = "DATABASE_URL не задан. Создай .env (см. .env.example) и запусти: npm run db:up";
    } else if (
      message.includes("Can't reach database server") ||
      message.includes("ECONNREFUSED") ||
      message.includes("P1001") ||
      message.includes("P1000") ||
      message.includes("Authentication failed")
    ) {
      dbError =
        "База данных недоступна. Проверьте, что docker compose up запущен и DATABASE_URL содержит правильный пароль.";
    } else {
      dbError = "Не удалось подключиться к базе данных.";
    }
  }

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
    <Container className="py-10">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-80">
          <JobFilters />
        </aside>

        <section className="flex-1 space-y-4">
          <PageHeader
            title="Заказы"
            description="Лента заданий для UGC-креаторов. В MVP фильтры базовые - расширим позже."
          />

          {user?.role === "CREATOR" ? <JobAlertCreator /> : null}

          {dbError ? (
            <Alert title="База данных недоступна" variant="warning">
              {dbError}
            </Alert>
          ) : null}

          {jobs && jobs.length === 0 ? (
            <EmptyState
              title="Пока нет подходящих заказов"
              description="Попробуйте сбросить фильтры или зайдите позже."
              action={
                <Link href="/jobs">
                  <Button variant="outline" size="sm">
                    Сбросить фильтры
                  </Button>
                </Link>
              }
            />
          ) : jobs ? (
            <>
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              {nextCursor ? (
                <div className="pt-4">
                  <Link href={`/jobs?${nextParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </Container>
  );
}
