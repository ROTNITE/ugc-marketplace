import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS, NICHE_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { WithdrawButton } from "@/components/applications/withdraw-button";
import { Button } from "@/components/ui/button";
import { getCreatorIds } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  PENDING: "Ожидает",
  ACCEPTED: "Принят",
  REJECTED: "Отклонен",
  WITHDRAWN: "Отозван",
} as const;

const JOB_STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Опубликован",
  PAUSED: "В работе",
  IN_REVIEW: "На проверке",
  COMPLETED: "Завершено",
};

export default async function ApplicationsPage() {
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

  if (user.role !== "CREATOR") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Только для креаторов">
          Эта страница доступна только аккаунтам креаторов.
        </Alert>
      </div>
    );
  }

  const unreadAcceptanceCount = await prisma.notification.count({
    where: {
      userId: user.id,
      isRead: false,
      type: "APPLICATION_ACCEPTED",
    },
  });

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      type: "APPLICATION_ACCEPTED",
    },
    data: { isRead: true },
  });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    include: { portfolioItems: { select: { id: true } } },
  });

  const isProfileEmpty =
    !profile ||
    (!profile.bio &&
      (profile.languages?.length ?? 0) === 0 &&
      (profile.platforms?.length ?? 0) === 0 &&
      (profile.niches?.length ?? 0) === 0 &&
      !profile.pricePerVideo &&
      (profile.portfolioItems?.length ?? 0) === 0);

  const creatorIds = getCreatorIds(user);

  const applications = await prisma.application.findMany({
    where: { creatorId: { in: creatorIds } },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          platform: true,
          niche: true,
          budgetMin: true,
          budgetMax: true,
          currency: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const acceptedJobIds = applications
    .filter((application) => application.status === "ACCEPTED")
    .map((application) => application.jobId);

  const conversations = acceptedJobIds.length
    ? await prisma.conversation.findMany({
        where: {
          jobId: { in: acceptedJobIds },
          participants: { some: { userId: user.id } },
        },
        select: { id: true, jobId: true },
      })
    : [];

  const conversationByJobId = new Map(
    conversations
      .filter((conversation) => conversation.jobId)
      .map((conversation) => [conversation.jobId as string, conversation.id]),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="space-y-1">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/deals">
          ← К сделкам
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Мои отклики</h1>
          {unreadAcceptanceCount ? <Badge variant="soft">Новое</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">Все заявки, которые вы отправили брендам.</p>
      </div>

      {isProfileEmpty ? (
        <Alert variant="info" title="Профиль не заполнен">
          Заполни профиль, чтобы бренды чаще выбирали тебя.{" "}
          <Link className="text-primary hover:underline" href="/dashboard/profile">
            Перейти к профилю
          </Link>
        </Alert>
      ) : null}

      {applications.length === 0 ? (
        <Alert variant="info" title="Пока нет откликов">
          <Link className="text-primary hover:underline" href="/jobs">
            Найти заказы
          </Link>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => {
            const job = application.job;
            const createdAt = formatDistanceToNow(new Date(application.createdAt), { addSuffix: true, locale: ru });
            const conversationId = conversationByJobId.get(job.id);

            return (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        <Link className="hover:underline" href={`/jobs/${job.id}`}>
                          {job.title}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        {PLATFORM_LABELS[job.platform]} · {NICHE_LABELS[job.niche]}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="soft">{STATUS_LABELS[application.status]}</Badge>
                      <Badge variant="soft">{JOB_STATUS_LABELS[application.job.status] ?? application.job.status}</Badge>
                      <span>{createdAt}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="text-muted-foreground">
                    Бюджет:{" "}
                    <span className="text-foreground font-medium">
                      {job.budgetMin}-{job.budgetMax} {CURRENCY_LABELS[job.currency]}
                    </span>
                  </div>

                  {application.message ? (
                    <div>
                      <span className="text-muted-foreground">Сообщение:</span>{" "}
                      <span className="text-foreground">{application.message}</span>
                    </div>
                  ) : null}

                  {application.priceQuote ? (
                    <div>
                      <span className="text-muted-foreground">Ваша цена:</span>{" "}
                      <span className="text-foreground">{application.priceQuote}</span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {application.status === "PENDING" ? (
                      <WithdrawButton applicationId={application.id} />
                    ) : null}
                    {application.status === "ACCEPTED" ? (
                      conversationId ? (
                        <Link href={`/dashboard/inbox/${conversationId}`}>
                          <Button size="sm" variant="outline">
                            Открыть чат
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Диалог пока не создан.</span>
                      )
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
