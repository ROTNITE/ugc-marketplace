import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandApplicationActions } from "@/components/applications/brand-application-actions";
import { Button } from "@/components/ui/button";
import { CURRENCY_LABELS } from "@/lib/constants";
import { isBrandOwner } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  PENDING: "Ожидает",
  ACCEPTED: "Принят",
  REJECTED: "Отклонен",
  WITHDRAWN: "Отозван",
} as const;

export default async function JobApplicationsPage({ params }: { params: { id: string } }) {
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
        <Alert variant="warning" title="Только для брендов">
          Эта страница доступна только аккаунтам брендов.
        </Alert>
      </div>
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        include: {
          creator: { include: { creatorProfile: { include: { portfolioItems: { select: { url: true } } } } } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Заказ не найден">
          Проверьте ссылку или вернитесь в список заказов.
        </Alert>
      </div>
    );
  }

  if (!isBrandOwner(user, job.brandId)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Этот заказ принадлежит другому бренду.
        </Alert>
      </div>
    );
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      href: `/dashboard/jobs/${job.id}/applications`,
    },
    data: { isRead: true },
  });

  const acceptedApplication = job.applications.find((application) => application.status === "ACCEPTED");

  const conversations = acceptedApplication
    ? await prisma.conversation.findMany({
        where: {
          jobId: job.id,
          participants: {
            some: { userId: { in: [user.id, acceptedApplication.creatorId] } },
          },
        },
        select: { id: true, participants: { select: { userId: true } } },
      })
    : [];

  const conversationId = conversations.find((conversation) =>
    conversation.participants.some((participant) => participant.userId === acceptedApplication?.creatorId),
  )?.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/jobs">
          Назад к моим заказам
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <Badge variant="soft">{job.status}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link className="text-primary hover:underline" href={`/jobs/${job.id}`}>
            Открыть заказ
          </Link>
          <Link className="text-primary hover:underline" href={`/dashboard/jobs/${job.id}/review`}>
            Перейти к приёмке
          </Link>
        </div>
      </div>

      {job.applications.length === 0 ? (
        <Alert variant="info" title="Пока нет откликов">
          Поделитесь ссылкой на заказ и вернитесь позже.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {job.applications.map((application) => {
            const creator = application.creator;
            const name = creator.name ?? "Креатор";
            const languages = creator.creatorProfile?.languages?.length
              ? creator.creatorProfile.languages.join(", ")
              : null;
            const pricePerVideo = creator.creatorProfile?.pricePerVideo ?? null;
            const currency = creator.creatorProfile?.currency ?? null;
            const portfolioLinks =
              creator.creatorProfile?.portfolioItems?.map((item) => item.url).filter(Boolean).slice(0, 2) ?? [];
            const createdAt = formatDistanceToNow(new Date(application.createdAt), { addSuffix: true, locale: ru });
            const isAccepted = application.status === "ACCEPTED";

            return (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{name}</CardTitle>
                      <CardDescription>{languages ? `Языки: ${languages}` : "Профиль без языков"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="soft">{STATUS_LABELS[application.status]}</Badge>
                      <span>{createdAt}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {pricePerVideo ? (
                    <div>
                      <span className="text-muted-foreground">Прайс:</span>{" "}
                      <span className="text-foreground">
                        {pricePerVideo} {currency ? CURRENCY_LABELS[currency] : ""}
                      </span>
                    </div>
                  ) : null}
                  {application.priceQuote ? (
                    <div>
                      <span className="text-muted-foreground">Цена:</span>{" "}
                      <span className="text-foreground">{application.priceQuote}</span>
                    </div>
                  ) : null}
                  {application.message ? (
                    <div>
                      <span className="text-muted-foreground">Сообщение:</span>{" "}
                      <span className="text-foreground">{application.message}</span>
                    </div>
                  ) : null}
                  {portfolioLinks.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Портфолио:</span>
                      {portfolioLinks.map((link) => (
                        <a
                          key={link}
                          className="text-primary hover:underline"
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ссылка
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {application.status === "PENDING" ? (
                    <BrandApplicationActions
                      jobId={job.id}
                      applicationId={application.id}
                      disableAccept={!!acceptedApplication}
                    />
                  ) : null}

                  {isAccepted ? (
                    conversationId ? (
                      <Link href={`/dashboard/inbox/${conversationId}`}>
                        <Button size="sm" variant="outline">
                          Перейти в чат
                        </Button>
                      </Link>
                    ) : (
                      <Alert variant="info" title="Чат не создан">
                        Обновите страницу через пару секунд.
                      </Alert>
                    )
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
