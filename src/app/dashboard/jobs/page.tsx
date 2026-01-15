import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function BrandJobsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
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

  if (user.role !== "BRAND") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только брендам.
        </Alert>
      </div>
    );
  }

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { userId: user.id },
    select: { companyName: true, website: true, description: true },
  });

  const isProfileEmpty = !brandProfile || (!brandProfile.website && !brandProfile.description);

  const brandIds = getBrandIds(user);

  const jobs = await prisma.job.findMany({
    where: { brandId: { in: brandIds } },
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
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

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

  const matchesTab = (job: (typeof jobs)[number], tab: TabKey) => {
    const isDraft = job.status === "DRAFT" && job.moderationStatus !== "REJECTED";
    const isModeration = job.status === "PUBLISHED" && job.moderationStatus === "PENDING";
    const isRejected = job.moderationStatus === "REJECTED";
    const isPublished = job.status === "PUBLISHED" && job.moderationStatus === "APPROVED";
    const isPaused = job.status === "PAUSED" && !job.activeCreatorId;
    const isActive = Boolean(job.activeCreatorId) && job.status !== "COMPLETED" && job.status !== "CANCELED";
    const isCompleted = job.status === "COMPLETED";
    const isCanceled = job.status === "CANCELED";

    switch (tab) {
      case "drafts":
        return isDraft;
      case "moderation":
        return isModeration;
      case "rejected":
        return isRejected;
      case "published":
        return isPublished;
      case "paused":
        return isPaused;
      case "active":
        return isActive;
      case "completed":
        return isCompleted;
      case "canceled":
        return isCanceled;
      default:
        return false;
    }
  };

  const counts: Record<TabKey, number> = {
    drafts: jobs.filter((job) => matchesTab(job, "drafts")).length,
    moderation: jobs.filter((job) => matchesTab(job, "moderation")).length,
    rejected: jobs.filter((job) => matchesTab(job, "rejected")).length,
    published: jobs.filter((job) => matchesTab(job, "published")).length,
    paused: jobs.filter((job) => matchesTab(job, "paused")).length,
    active: jobs.filter((job) => matchesTab(job, "active")).length,
    completed: jobs.filter((job) => matchesTab(job, "completed")).length,
    canceled: jobs.filter((job) => matchesTab(job, "canceled")).length,
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

  const filteredJobs = jobs.filter((job) => matchesTab(job, activeTab));

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

      {jobs.length === 0 ? (
        <EmptyState
          title="Пока нет заказов"
          description="Создайте первый заказ и опубликуйте в ленте."
          action={
            <Link className="text-primary hover:underline" href="/dashboard/jobs/new">
              Создать заказ
            </Link>
          }
        />
      ) : filteredJobs.length === 0 ? (
        <EmptyState title="Пусто" description="В этой вкладке пока нет заказов." />
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
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
                      <Badge variant="soft">{job.status}</Badge>
                      <Badge variant="soft">{job.moderationStatus}</Badge>
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
                          {hasUnreadApplications ? <Badge variant="soft" className="ml-2">Новое</Badge> : null}
                        </Button>
                      </Link>
                    ) : null}

                    {showReview ? (
                      <Link href={`/dashboard/jobs/${job.id}/review`}>
                        <Button size="sm" variant="outline">
                          Приёмка
                          {hasUnreadReview ? <Badge variant="soft" className="ml-2">Новое</Badge> : null}
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
        </div>
      )}
    </Container>
  );
}
