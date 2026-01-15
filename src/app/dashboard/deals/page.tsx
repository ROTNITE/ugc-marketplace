import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvitationActions } from "@/components/invitations/invitation-actions";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getBrandIds, getCreatorIds } from "@/lib/authz";
import {
  getApplicationStatusBadge,
  getEscrowStatusBadge,
  getInvitationStatusBadge,
  getJobStatusBadge,
  getModerationStatusBadge,
  getSubmissionStatusBadge,
} from "@/lib/status-badges";
import {
  buildCreatedAtCursorWhere,
  buildUpdatedAtCursorWhere,
  decodeCursor,
  parseCursor,
  parseLimit,
  sliceWithNextCursor,
} from "@/lib/pagination";

export const dynamic = "force-dynamic";


type DealsPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

type TabConfig = {
  id: string;
  label: string;
  count: number;
};

function getActiveTab(
  value: string | string[] | undefined,
  allowed: string[],
  fallback: string,
) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && allowed.includes(raw) ? raw : fallback;
}

function Tabs({ tabs, activeTab }: { tabs: TabConfig[]; activeTab: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`/dashboard/deals?tab=${tab.id}`}
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
            activeTab === tab.id
              ? "border-primary text-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
          <Badge variant="soft">{tab.count}</Badge>
        </Link>
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    "1) Бренд публикует",
    "2) Отклик/приглашение",
    "3) Выбор исполнителя",
    "4) Сдача материалов",
    "5) Приёмка",
    "6) Оплата и отзыв",
  ];

  return (
    <SectionCard title="Как работает сделка" description="Коротко о ключевых шагах.">
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <Badge key={step} variant="soft">
            {step}
          </Badge>
        ))}
      </div>
    </SectionCard>
  );
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
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

  if (user.role === "CREATOR") {
    const creatorIds = getCreatorIds(user);
    const limit = parseLimit(searchParams);
    const invitationCursor = decodeCursor<{ createdAt: string; id: string }>(
      parseCursor(searchParams, "invitationCursor"),
    );
    const applicationCursor = decodeCursor<{ createdAt: string; id: string }>(
      parseCursor(searchParams, "applicationCursor"),
    );
    const jobCursor = decodeCursor<{ updatedAt: string; id: string }>(
      parseCursor(searchParams, "jobCursor"),
    );

    const invitationWhere = { creatorId: { in: creatorIds }, status: "SENT" } as Prisma.InvitationWhereInput;
    const invitationCursorWhere = buildCreatedAtCursorWhere(invitationCursor);
    if (invitationCursorWhere) {
      invitationWhere.AND = [...(Array.isArray(invitationWhere.AND) ? invitationWhere.AND : invitationWhere.AND ? [invitationWhere.AND] : []), invitationCursorWhere];
    }

    const applicationWhere = { creatorId: { in: creatorIds } } as Prisma.ApplicationWhereInput;
    const applicationCursorWhere = buildCreatedAtCursorWhere(applicationCursor);
    if (applicationCursorWhere) {
      applicationWhere.AND = [...(Array.isArray(applicationWhere.AND) ? applicationWhere.AND : applicationWhere.AND ? [applicationWhere.AND] : []), applicationCursorWhere];
    }

    const jobWhere = { activeCreatorId: { in: creatorIds }, status: { in: ["PAUSED", "IN_REVIEW", "COMPLETED"] } } as Prisma.JobWhereInput;
    const jobCursorWhere = buildUpdatedAtCursorWhere(jobCursor);
    if (jobCursorWhere) {
      jobWhere.AND = [...(Array.isArray(jobWhere.AND) ? jobWhere.AND : jobWhere.AND ? [jobWhere.AND] : []), jobCursorWhere];
    }

    const [invitationResult, applicationResult, jobResult] = await Promise.all([
      prisma.invitation.findMany({
        where: invitationWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          message: true,
          job: { select: { id: true, title: true } },
          brand: { select: { name: true, brandProfile: { select: { companyName: true } } } },
        },
        take: limit + 1,
      }),
      prisma.application.findMany({
        where: applicationWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          job: { select: { id: true, title: true, status: true } },
        },
        take: limit + 1,
      }),
      prisma.job.findMany({
        where: jobWhere,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
        take: limit + 1,
      }),
    ]);

    const invitationPaged = sliceWithNextCursor(invitationResult, limit, (item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
    }));
    const applicationPaged = sliceWithNextCursor(applicationResult, limit, (item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
    }));
    const jobPaged = sliceWithNextCursor(jobResult, limit, (item) => ({
      id: item.id,
      updatedAt: item.updatedAt.toISOString(),
    }));

    const invitations = invitationPaged.items;
    const applications = applicationPaged.items;
    const jobs = jobPaged.items;

    const acceptedJobIds = applications
      .filter((application) => application.status === "ACCEPTED")
      .map((application) => application.job.id);

    const conversations = acceptedJobIds.length
      ? await prisma.conversation.findMany({
          where: {
            jobId: { in: acceptedJobIds },
            participants: { some: { userId: user.id } },
          },
          select: { id: true, jobId: true, participants: { select: { userId: true } } },
        })
      : [];

    const conversationByJobId = new Map(
      conversations
        .filter((conversation) => conversation.jobId)
        .map((conversation) => [conversation.jobId as string, conversation.id]),
    );

    const lastSubmissions = jobs.length
      ? await prisma.submission.findMany({
          where: { jobId: { in: jobs.map((job) => job.id) } },
          orderBy: { version: "desc" },
          distinct: ["jobId"],
          select: { jobId: true, status: true, createdAt: true },
        })
      : [];
    const submissionByJob = new Map(lastSubmissions.map((item) => [item.jobId, item]));

    const jobsCompleted = jobs.filter((job) => job.status === "COMPLETED");
    const jobsInReviewOrChanges = jobs.filter((job) => {
      if (job.status === "IN_REVIEW") return true;
      const lastSubmission = submissionByJob.get(job.id);
      return lastSubmission?.status === "CHANGES_REQUESTED";
    });
    const jobsInWork = jobs.filter((job) => {
      if (job.status !== "PAUSED") return false;
      const lastSubmission = submissionByJob.get(job.id);
      return lastSubmission?.status !== "CHANGES_REQUESTED";
    });

    const completedJobIds = jobsCompleted.map((job) => job.id);
    const reviewsWritten = completedJobIds.length
      ? await prisma.review.findMany({
          where: { fromUserId: user.id, jobId: { in: completedJobIds } },
          select: { jobId: true },
        })
      : [];
    const reviewedJobIds = new Set(reviewsWritten.map((review) => review.jobId));

    const creatorTabs: TabConfig[] = [
      { id: "invitations", label: "Приглашения", count: invitations.length },
      { id: "applications", label: "Отклики", count: applications.length },
      { id: "work", label: "В работе", count: jobsInWork.length },
      { id: "review", label: "На проверке/Правки", count: jobsInReviewOrChanges.length },
      { id: "completed", label: "Завершено", count: jobsCompleted.length },
    ];
    const activeTab = getActiveTab(searchParams.tab, creatorTabs.map((tab) => tab.id), "invitations");

    const baseParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => baseParams.append(key, item));
        return;
      }
      if (value !== undefined) {
        baseParams.set(key, value);
      }
    });
    ["invitationCursor", "applicationCursor", "jobCursor"].forEach((key) => baseParams.delete(key));

    const invitationParams = new URLSearchParams(baseParams);
    if (invitationPaged.nextCursor) {
      invitationParams.set("invitationCursor", invitationPaged.nextCursor);
      invitationParams.set("limit", String(limit));
    }
    const applicationParams = new URLSearchParams(baseParams);
    if (applicationPaged.nextCursor) {
      applicationParams.set("applicationCursor", applicationPaged.nextCursor);
      applicationParams.set("limit", String(limit));
    }
    const jobParams = new URLSearchParams(baseParams);
    if (jobPaged.nextCursor) {
      jobParams.set("jobCursor", jobPaged.nextCursor);
      jobParams.set("limit", String(limit));
    }

    return (
      <Container className="py-10 space-y-6" motion>
        <PageHeader
          title="Сделки"
          description="Здесь вся ваша работа: приглашения, отклики, сдачи и приёмка."
          eyebrow={
            <Link className="hover:text-foreground" href="/dashboard">
              В кабинет
            </Link>
          }
        />

        <HowItWorks />
        <Tabs tabs={creatorTabs} activeTab={activeTab} />

        {activeTab === "invitations" ? (
          invitations.length === 0 ? (
            <EmptyState
              title="Приглашений пока нет"
              description="Когда бренд отправит приглашение, оно появится здесь."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {invitations.map((invitation) => {
                  const brandName =
                    invitation.brand.brandProfile?.companyName || invitation.brand.name || "Бренд";
                  const invitationBadge = getInvitationStatusBadge(invitation.status);
                  return (
                    <Card key={invitation.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{invitation.job.title}</CardTitle>
                            <CardDescription>Бренд: {brandName}</CardDescription>
                          </div>
                          <Badge variant={invitationBadge.variant} tone={invitationBadge.tone}>
                            {invitationBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">Что дальше: принять или отклонить приглашение.</p>
                        {invitation.message ? (
                          <p className="text-muted-foreground whitespace-pre-wrap">{invitation.message}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3">
                          <InvitationActions invitationId={invitation.id} jobId={invitation.job.id} />
                          <Link className="text-primary hover:underline" href={`/jobs/${invitation.job.id}`}>
                            Открыть заказ
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {invitationPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${invitationParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "applications" ? (
          applications.length === 0 ? (
            <EmptyState
              title="Откликов пока нет"
              description="Откликнитесь на заказ из ленты."
              action={
                <Link className="text-primary hover:underline" href="/jobs">
                  Найти заказы
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-4">
                {applications.map((application) => {
                  const conversationId = conversationByJobId.get(application.job.id);
                  const createdAt = formatDistanceToNow(new Date(application.createdAt), {
                    addSuffix: true,
                    locale: ru,
                  });
                  const applicationBadge = getApplicationStatusBadge(application.status);
                  const nextHint =
                    application.status === "PENDING"
                      ? "Ждём ответа бренда"
                      : application.status === "ACCEPTED"
                        ? "Отклик принят - можно перейти в чат"
                        : application.status === "REJECTED"
                          ? "Отклик отклонен"
                          : "Отклик отозван";
                  return (
                    <Card key={application.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{application.job.title}</CardTitle>
                            <CardDescription>Отправлено {createdAt}</CardDescription>
                          </div>
                          <Badge variant={applicationBadge.variant} tone={applicationBadge.tone}>
                            {applicationBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">Что дальше: {nextHint}.</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/jobs/${application.job.id}`}>
                            <Button size="sm" variant="outline">Открыть заказ</Button>
                          </Link>
                          {application.status === "ACCEPTED" && conversationId ? (
                            <Link href={`/dashboard/inbox/${conversationId}`}>
                              <Button size="sm">Открыть чат</Button>
                            </Link>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {applicationPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${applicationParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "work" ? (
          jobsInWork.length === 0 ? (
            <EmptyState
              title="Нет активных работ"
              description="После принятия отклика работа появится здесь."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {jobsInWork.map((job) => {
                  const jobStatusBadge = getJobStatusBadge(job.status);
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>
                              Обновлено {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true, locale: ru })}
                            </CardDescription>
                          </div>
                          <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                            {jobStatusBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p className="text-muted-foreground">Что дальше: сдайте материалы через страницу работы.</p>
                        <Link href={`/dashboard/work/${job.id}`}>
                          <Button size="sm">Открыть работу</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "review" ? (
          jobsInReviewOrChanges.length === 0 ? (
            <EmptyState
              title="Пока нет работ на проверке"
              description="Когда вы отправите материалы, бренд проверит их здесь."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {jobsInReviewOrChanges.map((job) => {
                  const submission = submissionByJob.get(job.id);
                  const statusBadge = submission?.status
                    ? getSubmissionStatusBadge(submission.status)
                    : getJobStatusBadge(job.status);
                  const nextHint =
                    submission?.status === "CHANGES_REQUESTED"
                      ? "Бренд запросил правки"
                      : "Материалы на проверке";
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>Что дальше: {nextHint}.</CardDescription>
                          </div>
                          <Badge variant={statusBadge.variant} tone={statusBadge.tone}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Link href={`/dashboard/work/${job.id}`}>
                          <Button size="sm">Открыть работу</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "completed" ? (
          jobsCompleted.length === 0 ? (
            <EmptyState
              title="Завершённых заказов пока нет"
              description="После приёмки брендом заказы появятся здесь."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {jobsCompleted.map((job) => {
                  const canReview = !reviewedJobIds.has(job.id);
                  const jobStatusBadge = getJobStatusBadge(job.status);
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>Заказ завершён.</CardDescription>
                          </div>
                          <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                            {jobStatusBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button size="sm" variant="outline">Открыть заказ</Button>
                        </Link>
                        {canReview ? (
                          <Link href="/dashboard/reviews">
                            <Button size="sm">Оставить отзыв</Button>
                          </Link>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}
      </Container>
    );
  }

  if (user.role === "BRAND") {
    const brandIds = getBrandIds(user);
    const limit = parseLimit(searchParams);
    const jobCursor = decodeCursor<{ updatedAt: string; id: string }>(
      parseCursor(searchParams, "jobCursor"),
    );
    const jobCursorWhere = buildUpdatedAtCursorWhere(jobCursor);
    const jobWhere = { brandId: { in: brandIds } } as Prisma.JobWhereInput;
    if (jobCursorWhere) {
      jobWhere.AND = [...(Array.isArray(jobWhere.AND) ? jobWhere.AND : jobWhere.AND ? [jobWhere.AND] : []), jobCursorWhere];
    }

    const jobResult = await prisma.job.findMany({
      where: jobWhere,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        updatedAt: true,
        activeCreatorId: true,
        activeCreator: { select: { name: true } },
        escrow: { select: { status: true } },
        _count: { select: { applications: true } },
      },
      take: limit + 1,
    });

    const jobPaged = sliceWithNextCursor(jobResult, limit, (job) => ({
      id: job.id,
      updatedAt: job.updatedAt.toISOString(),
    }));
    const jobs = jobPaged.items;

    const reviewJobs = jobs.filter((job) => job.status === "IN_REVIEW");
    const activeJobs = jobs.filter((job) => job.status === "PAUSED");
    const completedJobs = jobs.filter((job) => job.status === "COMPLETED");
    const moderationJobs = jobs.filter((job) => job.moderationStatus === "PENDING");
    const applicationJobs = jobs.filter((job) => job._count.applications > 0);

    const reviewsWritten = completedJobs.length
      ? await prisma.review.findMany({
          where: { fromUserId: user.id, jobId: { in: completedJobs.map((job) => job.id) } },
          select: { jobId: true },
        })
      : [];
    const reviewedJobIds = new Set(reviewsWritten.map((review) => review.jobId));

    const jobsWithCreator = jobs.filter((job) => job.activeCreatorId);
    const conversations = jobsWithCreator.length
      ? await prisma.conversation.findMany({
          where: {
            jobId: { in: jobsWithCreator.map((job) => job.id) },
            participants: { some: { userId: user.id } },
          },
          select: { id: true, jobId: true, participants: { select: { userId: true } } },
        })
      : [];

    const conversationByJobId = new Map(
      conversations
        .filter((conversation) => conversation.jobId)
        .map((conversation) => [conversation.jobId as string, conversation.id]),
    );

    const brandTabs: TabConfig[] = [
      { id: "moderation", label: "На модерации", count: moderationJobs.length },
      { id: "applications", label: "Отклики", count: applicationJobs.length },
      { id: "work", label: "В работе", count: activeJobs.length },
      { id: "review", label: "На приемке", count: reviewJobs.length },
      { id: "completed", label: "Завершено", count: completedJobs.length },
    ];

    const activeTab = getActiveTab(searchParams.tab, brandTabs.map((tab) => tab.id), "moderation");

    const baseParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => baseParams.append(key, item));
        return;
      }
      if (value !== undefined) {
        baseParams.set(key, value);
      }
    });
    baseParams.delete("jobCursor");
    const jobParams = new URLSearchParams(baseParams);
    if (jobPaged.nextCursor) {
      jobParams.set("jobCursor", jobPaged.nextCursor);
      jobParams.set("limit", String(limit));
    }

    return (
      <Container className="py-10 space-y-6" motion>
        <PageHeader
          title="Сделки"
          description="Управляйте заказами, откликами и приёмкой материалов."
          eyebrow={
            <Link className="hover:text-foreground" href="/dashboard">
              В кабинет
            </Link>
          }
        />

        <HowItWorks />
        <Tabs tabs={brandTabs} activeTab={activeTab} />

        {activeTab === "moderation" ? (
          moderationJobs.length === 0 ? (
            <EmptyState
              title="Заказы на модерации отсутствуют"
              description="Новые публикации появятся здесь после отправки."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {moderationJobs.map((job) => {
                  const moderationBadge = getModerationStatusBadge(job.moderationStatus);
                  const jobStatusBadge = getJobStatusBadge(job.status);
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>{moderationBadge.label}</CardDescription>
                          </div>
                          <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                            {jobStatusBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground">Что дальше: дождитесь одобрения модерации.</p>
                        <Link href={`/jobs/${job.id}`}>
                          <Button size="sm" variant="outline">Открыть заказ</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "applications" ? (
          applicationJobs.length === 0 ? (
            <EmptyState
              title="Откликов пока нет"
              description="Поделитесь заказом с креаторами или пригласите напрямую."
              action={
                <Link className="text-primary hover:underline" href="/creators">
                  Перейти к каталогу креаторов
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-4">
                {applicationJobs.map((job) => {
                  const jobStatusBadge = getJobStatusBadge(job.status);
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>Отклики: {job._count.applications}</CardDescription>
                          </div>
                          <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                            {jobStatusBadge.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground">Что дальше: выберите исполнителя.</p>
                        <Link href={`/dashboard/jobs/${job.id}/applications`}>
                          <Button size="sm">Открыть заявки</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "work" ? (
          activeJobs.length === 0 ? (
            <EmptyState
              title="Нет заказов в работе"
              description="После принятия отклика заказ появится здесь."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {activeJobs.map((job) => {
                  const conversationId = conversationByJobId.get(job.id);
                  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
                  const escrowBadge = job.escrow?.status ? getEscrowStatusBadge(job.escrow.status) : null;
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>
                              Исполнитель: {job.activeCreator?.name ?? "Не указан"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                              {jobStatusBadge.label}
                            </Badge>
                            {escrowBadge ? (
                              <Badge variant={escrowBadge.variant} tone={escrowBadge.tone}>
                                {escrowBadge.label}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        {conversationId ? (
                          <Link href={`/dashboard/inbox/${conversationId}`}>
                            <Button size="sm">Открыть чат</Button>
                          </Link>
                        ) : (
                          <Link href={`/jobs/${job.id}`}>
                            <Button size="sm" variant="outline">Открыть заказ</Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "review" ? (
          reviewJobs.length === 0 ? (
            <EmptyState
              title="Нет материалов на приёмке"
              description="Когда креатор сдаст материалы, заказы появятся здесь."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {reviewJobs.map((job) => {
                  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
                  const escrowBadge = job.escrow?.status ? getEscrowStatusBadge(job.escrow.status) : null;
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>
                              Исполнитель: {job.activeCreator?.name ?? "Не указан"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                              {jobStatusBadge.label}
                            </Badge>
                            {escrowBadge ? (
                              <Badge variant={escrowBadge.variant} tone={escrowBadge.tone}>
                                {escrowBadge.label}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p className="text-muted-foreground">Что дальше: принять или запросить правки.</p>
                        <Link href={`/dashboard/jobs/${job.id}/review`}>
                          <Button size="sm">Открыть приёмку</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}

        {activeTab === "completed" ? (
          completedJobs.length === 0 ? (
            <EmptyState
              title="Завершённых заказов пока нет"
              description="Заказы появятся здесь после приёмки."
            />
          ) : (
            <>
              <div className="grid gap-4">
                {completedJobs.map((job) => {
                  const canReview = !reviewedJobIds.has(job.id);
                  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
                  const escrowBadge = job.escrow?.status ? getEscrowStatusBadge(job.escrow.status) : null;
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>
                              Исполнитель: {job.activeCreator?.name ?? "Не указан"}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
                              {jobStatusBadge.label}
                            </Badge>
                            {escrowBadge ? (
                              <Badge variant={escrowBadge.variant} tone={escrowBadge.tone}>
                                {escrowBadge.label}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button size="sm" variant="outline">Открыть заказ</Button>
                        </Link>
                        {canReview ? (
                          <Link href="/dashboard/reviews">
                            <Button size="sm">Оставить отзыв</Button>
                          </Link>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {jobPaged.nextCursor ? (
                <div>
                  <Link href={`/dashboard/deals?${jobParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : null}
      </Container>
    );
  }

  return (
    <Container size="sm" className="py-10">
      <Alert variant="warning" title="Недоступно">
        Эта страница доступна только брендам и креаторам.
      </Alert>
    </Container>
  );
}
