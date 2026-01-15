import { prisma } from "@/lib/prisma";
import { JobFilters } from "@/components/jobs/job-filters";
import { JobCard } from "@/components/jobs/job-card";
import { Alert } from "@/components/ui/alert";
import { parseJobListFilters, buildJobWhere, buildJobOrderBy } from "@/lib/jobs/filters";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { JobAlertCreator } from "@/components/jobs/job-alert-creator";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseJobListFilters(searchParams);
  const session = await getServerSession(authOptions);
  const user = session?.user;

  let jobs: Awaited<ReturnType<typeof prisma.job.findMany>> | null = null;
  let dbError: string | null = null;

  try {
    jobs = await prisma.job.findMany({
      where: buildJobWhere(filters),
      orderBy: buildJobOrderBy(filters),
      take: 50,
    });
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-80">
          <JobFilters />
        </aside>

        <section className="flex-1 space-y-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Заказы</h2>
              <p className="text-sm text-muted-foreground">
                Лента заданий для UGC-креаторов. В MVP фильтры базовые - расширим позже.
              </p>
            </div>
          </div>

          {user?.role === "CREATOR" ? <JobAlertCreator /> : null}

          {dbError ? (
            <Alert title="База данных недоступна" variant="warning">
              {dbError}
            </Alert>
          ) : null}

          {jobs && jobs.length === 0 ? (
            <Alert title="Пока нет подходящих заказов" variant="info">
              Попробуйте сбросить фильтры или зайдите позже.
            </Alert>
          ) : jobs ? (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
