import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandApplicationActions } from "@/components/applications/brand-application-actions";
import { Button } from "@/components/ui/button";
import { CURRENCY_LABELS } from "@/lib/constants";
import { isBrandOwner } from "@/lib/authz";
import { getApplicationStatusBadge, getJobStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function JobApplicationsPage({
  params,
  searchParams,
}: {
  params: { id: string };
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

  if (user.role !== "BRAND") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для брендов">
          Эта страница доступна только аккаунтам брендов.
        </Alert>
      </Container>
    );
  }

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      applications: {
        where: cursorWhere ? { AND: [cursorWhere] } : undefined,
        include: {
          creator: { include: { creatorProfile: { include: { portfolioItems: { select: { url: true } } } } } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      },
    },
  });

  if (!job) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Заказ не найден">
          Проверьте ссылку или вернитесь в список заказов.
        </Alert>
      </Container>
    );
  }

  if (!isBrandOwner(user, job.brandId)) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Этот заказ принадлежит другому бренду.
        </Alert>
      </Container>
    );
  }

  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });

  const pagedApplications = sliceWithNextCursor(job.applications, limit, (application) => ({
    id: application.id,
    createdAt: application.createdAt.toISOString(),
  }));
  const applications = pagedApplications.items;
  const nextCursor = pagedApplications.nextCursor;

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

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      href: `/dashboard/jobs/${job.id}/applications`,
    },
    data: { isRead: true },
  });

  const acceptedApplication = await prisma.application.findFirst({
    where: { jobId: job.id, status: "ACCEPTED" },
    select: { id: true, creatorId: true },
  });

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
    <Container className="py-10 space-y-6">
      <PageHeader
        title={job.title}
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/jobs">
            Назад к моим заказам
          </Link>
        }
        actions={
          <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
            {jobStatusBadge.label}
          </Badge>
        }
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="text-primary hover:underline" href={`/jobs/${job.id}`}>
          Открыть заказ
        </Link>
        <Link className="text-primary hover:underline" href={`/dashboard/jobs/${job.id}/review`}>
          Перейти к приёмке
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState title="Пока нет откликов" description="Поделитесь ссылкой на заказ и вернитесь позже." />
      ) : (
        <>
          <div className="grid gap-4">
            {applications.map((application) => {
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
              const statusBadge = getApplicationStatusBadge(application.status);

              return (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>{name}</CardTitle>
                        <CardDescription>{languages ? `Языки: ${languages}` : "Профиль без языков"}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={statusBadge.variant} tone={statusBadge.tone}>
                          {statusBadge.label}
                        </Badge>
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
          {nextCursor ? (
            <div>
              <Link href={`/dashboard/jobs/${job.id}/applications?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
