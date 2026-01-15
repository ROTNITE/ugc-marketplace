import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Prisma } from "@prisma/client";
import { JobStatus, ModerationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PLATFORM_LABELS, NICHE_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { JobResubmitButton } from "@/components/jobs/job-resubmit-button";
import { JobPauseToggle, JobDuplicateButton } from "@/components/jobs/job-actions";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBrandIds } from "@/lib/authz";
import { getJobStatusBadge, getModerationStatusBadge } from "@/lib/status-badges";
import { buildUpdatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

type TabKey =
  | "drafts"
  | "moderation"
  | "rejected"
  | "published"
  | "paused"
  | "active"
  | "completed"
  | "canceled";

const TAB_LABELS: Record<TabKey, string> = {
  drafts: "Черновики",
  moderation: "На модерации",
  rejected: "Отклонены",
  published: "Опубликованы",
  paused: "На паузе",
  active: "В работе",
  completed: "Завершены",
  canceled: "Отменены",
};

const buildTabWhere = (tab: TabKey, brandIds: string[]): Prisma.JobWhereInput => {
  const base: Prisma.JobWhereInput = { brandId: { in: brandIds } };
  switch (tab) {
    case "drafts":
      return { ...base, status: JobStatus.DRAFT, moderationStatus: { not: ModerationStatus.REJECTED } };
    case "moderation":
      return { ...base, status: JobStatus.PUBLISHED, moderationStatus: ModerationStatus.PENDING };
    case "rejected":
      return { ...base, moderationStatus: ModerationStatus.REJECTED };
    case "published":
      return { ...base, status: JobStatus.PUBLISHED, moderationStatus: ModerationStatus.APPROVED };
    case "paused":
      return { ...base, status: JobStatus.PAUSED, activeCreatorId: null };
    case "active":
      return {
        ...base,
        activeCreatorId: { not: null },
        status: { notIn: [JobStatus.COMPLETED, JobStatus.CANCELED] },
      };
    case "completed":
      return { ...base, status: JobStatus.COMPLETED };
    case "canceled":
      return { ...base, status: JobStatus.CANCELED };
    default:
      return base;
  }
};

export default async function BrandJobsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
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

  if (user.role !== "BRAND") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только брендам.
        </Alert>
      </Container>
    );
  }

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { userId: user.id },
    select: { companyName: true, website: true, description: true },
  });

  const isProfileEmpty = !brandProfile || (!brandProfile.website && !brandProfile.description);

  const brandIds = getBrandIds(user);

  const [
    draftsCount,
    moderationCount,
    rejectedCount,
    publishedCount,
    pausedCount,
    activeCount,
    completedCount,
    canceledCount,
  ] = await Promise.all([
    prisma.job.count({ where: buildTabWhere("drafts", brandIds) }),
    prisma.job.count({ where: buildTabWhere("moderation", brandIds) }),
    prisma.job.count({ where: buildTabWhere("rejected", brandIds) }),
    prisma.job.count({ where: buildTabWhere("published", brandIds) }),
    prisma.job.count({ where: buildTabWhere("paused", brandIds) }),
    prisma.job.count({ where: buildTabWhere("active", brandIds) }),
    prisma.job.count({ where: buildTabWhere("completed", brandIds) }),
    prisma.job.count({ where: buildTabWhere("canceled", brandIds) }),
  ]);

  const counts: Record<TabKey, number> = {
    drafts: draftsCount,
    moderation: moderationCount,
    rejected: rejectedCount,
    published: publishedCount,
    paused: pausedCount,
    active: activeCount,
    completed: completedCount,
    canceled: canceledCount,
  };

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [];
  if (counts.drafts > 0) {
    tabs.push({ key: "drafts", label: TAB_LABELS.drafts, count: counts.drafts });
  }
  tabs.push(
    { key: "moderation", label: TAB_LABELS.moderation, count: counts.moderation },
    { key: "rejected", label: TAB_LABELS.rejected, count: counts.rejected },
    { key: "published", label: TAB_LABELS.published, count: counts.published },
    { key: "paused", label: TAB_LABELS.paused, count: counts.paused },
    { key: "active", label: TAB_LABELS.active, count: counts.active },
    { key: "completed", label: TAB_LABELS.completed, count: counts.completed },
    { key: "canceled", label: TAB_LABELS.canceled, count: counts.canceled },
  );

  const rawTab = typeof searchParams?.tab === "string" ? searchParams.tab : undefined;
  const activeTab = tabs.some((tab) => tab.key === rawTab) ? (rawTab as TabKey) : tabs[0]?.key ?? "published";
  const activeTabCount = counts[activeTab] ?? 0;

  const limit = parseLimit(searchParams ?? {}, { defaultLimit: 50 });
  const cursor = decodeCursor<{ updatedAt: string; id: string }>(parseCursor(searchParams ?? {}));
  const cursorWhere = buildUpdatedAtCursorWhere(cursor);
  const listWhere = {
    ...buildTabWhere(activeTab, brandIds),
    ...(cursorWhere ? { AND: [cursorWhere] } : {}),
  };

  const jobsResult = await prisma.job.findMany({
    where: listWhere,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      moderationStatus: true,
      moderationReason: true,
      platform: true,
      niche: true,
      budgetMin: true,
      budgetMax: true,
      currency: true,
      activeCreatorId: true,
      activeCreator: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(jobsResult, limit, (job) => ({
    id: job.id,
    updatedAt: job.updatedAt.toISOString(),
  }));
  const jobs = paged.items;
  const nextCursor = paged.nextCursor;

  const totalJobs = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const activeJobIds = jobs.filter((job) => job.activeCreatorId).map((job) => job.id);
  const conversations = activeJobIds.length
    ? await prisma.conversation.findMany({
        where: {
          jobId: { in: activeJobIds },
          participants: { some: { userId: user.id } },
        },
        select: { id: true, jobId: true },
      })
    : [];
  const conversationByJobId = new Map(
    conversations.map((conversation) => [conversation.jobId ?? "", conversation.id]),
  );

  const unreadNotifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      isRead: false,
      href: { startsWith: "/dashboard/jobs/" },
    },
    select: { href: true },
  });

  const unreadApplicationsByJob = new Set<string>();
  const unreadReviewsByJob = new Set<string>();
  for (const item of unreadNotifications) {
    const href = item.href ?? "";
    const parts = href.split("/");
    const jobId = parts[3];
    const tail = parts[4];
    if (!jobId || !tail) continue;
    if (tail === "applications") unreadApplicationsByJob.add(jobId);
    if (tail === "review") unreadReviewsByJob.add(jobId);
  }

  const nextParams = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
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
    <Container className="py-10 space-y-6" motion>
      <PageHeader
        title="Центр управления заказами"
        description="Все статусы и действия в одном месте."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/deals">
            К сделкам
          </Link>
        }
        actions={
          <Link href="/dashboard/jobs/new">
            <Button>Создать заказ</Button>
          </Link>
        }
      />

      {isProfileEmpty ? (
        <Alert variant="warning" title="Профиль бренда не заполнен">
          Заполните профиль бренда, чтобы креаторы лучше понимали ваш продукт.{" "}
          <Link className="text-primary hover:underline" href="/dashboard/profile">
            Перейти к профилю
          </Link>
        </Alert>
      ) : null}

      <SectionCard title="Категории" description="Счётчики показывают текущее состояние заказов.">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              className={`rounded-md border px-3 py-1 text-sm transition ${
                tab.key === activeTab
                  ? "border-primary text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              href={`/dashboard/jobs?tab=${tab.key}`}
            >
              {tab.label} ({tab.count})
            </Link>
          ))}
        </div>
      </SectionCard>

      {totalJobs === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          description="Создайте первый заказ и опубликуйте в ленте."
          action={
            <Link className="text-primary hover:underline" href="/dashboard/jobs/new">
              Создать заказ
            </Link>
          }
        />
      ) : activeTabCount === 0 ? (
        <EmptyState title="Пусто" description="В этой вкладке пока нет заказов." />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const createdAt = formatDistanceToNow(job.createdAt, { addSuffix: true, locale: ru });
            const hasUnreadApplications = unreadApplicationsByJob.has(job.id);
            const hasUnreadReview = unreadReviewsByJob.has(job.id);
            const canEdit = !job.activeCreatorId && job.status !== "COMPLETED" && job.status !== "CANCELED";
            const canDuplicate = job.status !== "COMPLETED" && job.status !== "CANCELED";
            const canPause = !job.activeCreatorId && job.status === "PUBLISHED";
            const canUnpause = !job.activeCreatorId && job.status === "PAUSED";
            const hasApplications = job._count.applications > 0;
            const showReview = job.status === "IN_REVIEW";
            const conversationId = job.activeCreatorId ? conversationByJobId.get(job.id) : undefined;
            const creatorName = job.activeCreator?.name?.trim() || "Креатор";
            const reason = job.moderationReason?.trim();
            const shortReason = reason && reason.length > 140 ? `${reason.slice(0, 140)}...` : reason;
            const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
            const moderationBadge = getModerationStatusBadge(job.moderationStatus);

            return (
              <Card
                key={job.id}
                className={hasUnreadApplications || hasUnreadReview ? "border-primary/40" : undefined}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription>
                        {PLATFORM_LABELS[job.platform]} · {NICHE_LABELS[job.niche]} · {createdAt}
                      </CardDescription>
                      {shortReason ? (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          Причина отклонения: {shortReason}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                  <div className="text-muted-foreground">
                    Бюджет: <span className="text-foreground font-medium">{job.budgetMin}-{job.budgetMax}</span>{" "}
                    {CURRENCY_LABELS[job.currency]}
                  </div>

                  {job.activeCreatorId ? (
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      Исполнитель: <span className="text-foreground font-medium">{creatorName}</span>
                      {conversationId ? (
                        <Link className="text-primary hover:underline" href={`/dashboard/inbox/${conversationId}`}>
                          Чат
                        </Link>
                      ) : null}
                      {showReview ? (
                        <Link className="text-primary hover:underline" href={`/dashboard/jobs/${job.id}/review`}>
                          Приёмка
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <Link href={`/dashboard/jobs/${job.id}/edit`}>
                        <Button size="sm" variant="outline">
                          Редактировать
                        </Button>
                      </Link>
                    ) : null}

                    {job.moderationStatus === "REJECTED" ? <JobResubmitButton jobId={job.id} /> : null}

                    {canDuplicate ? <JobDuplicateButton jobId={job.id} /> : null}

                    {canPause || canUnpause ? <JobPauseToggle jobId={job.id} status={job.status} /> : null}

                    {hasApplications ? (
                      <Link href={`/dashboard/jobs/${job.id}/applications`}>
                        <Button size="sm" variant="outline">
                          Отклики ({job._count.applications})
                          {hasUnreadApplications ? (
                            <Badge variant="soft" tone="info" className="ml-2">
                              Новое
                            </Badge>
                          ) : null}
                        </Button>
                      </Link>
                    ) : null}

                    {showReview ? (
                      <Link href={`/dashboard/jobs/${job.id}/review`}>
                        <Button size="sm" variant="outline">
                          Приёмка
                          {hasUnreadReview ? (
                            <Badge variant="soft" tone="info" className="ml-2">
                              Новое
                            </Badge>
                          ) : null}
                        </Button>
                      </Link>
                    ) : null}

                    <Link href={`/jobs/${job.id}`}>
                      <Button size="sm" variant="outline">
                        Открыть
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {nextCursor ? (
            <div className="flex justify-center">
              <Link href={`/dashboard/jobs?${nextParams.toString()}`}>
                <Button variant="outline">Показать ещё</Button>
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </Container>
  );
}
