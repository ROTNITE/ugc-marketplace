import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmissionForm } from "@/components/work/submission-form";
import { RIGHTS_PACKAGE_LABELS, CONTENT_FORMAT_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { convertCents } from "@/lib/payments";
import { DisputeOpenForm } from "@/components/disputes/dispute-open-form";
import { DisputeMessageForm } from "@/components/disputes/dispute-message-form";
import { DisputeMessageList } from "@/components/disputes/dispute-message-list";
import { isCreatorOwner } from "@/lib/authz";
import { getEscrowStatusBadge, getJobStatusBadge, getSubmissionStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function WorkDetailPage({ params }: { params: { id: string } }) {
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

  if (user.role !== "CREATOR") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для креаторов">
          Эта страница доступна только аккаунтам креаторов.
        </Alert>
      </Container>
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      submissions: {
        orderBy: { version: "desc" },
        include: { items: true },
      },
      escrow: true,
      dispute: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 50,
            include: { authorUser: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!job || !isCreatorOwner(user, job.activeCreatorId)) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Заказ не найден или недоступен.
        </Alert>
      </Container>
    );
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      href: `/dashboard/work/${job.id}`,
    },
    data: { isRead: true },
  });

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
    select: { currency: true },
  });

  const escrowCurrency = job.escrow?.currency ?? wallet?.currency ?? "RUB";
  const payoutCurrency = wallet?.currency ?? escrowCurrency;
  const escrowAmountCents = job.escrow
    ? convertCents(job.escrow.amountCents, job.escrow.currency, payoutCurrency)
    : 0;
  const payoutCurrencyLabel = CURRENCY_LABELS[payoutCurrency] ?? payoutCurrency;
  const dispute = job.dispute;
  const disputeOpen = dispute?.status === "OPEN";
  const canOpenDispute =
    !disputeOpen && job.status !== "COMPLETED" && job.status !== "CANCELED" && Boolean(job.activeCreatorId);
  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
  const escrowStatusBadge = job.escrow ? getEscrowStatusBadge(job.escrow.status) : null;

  return (
    <Container size="lg" className="py-10 space-y-6">
      <PageHeader
        title={job.title}
        description={
          <>
            Бюджет {job.budgetMin}-{job.budgetMax} {job.currency} · Дедлайн:{" "}
            {job.deadlineType === "DATE" && job.deadlineDate
              ? format(job.deadlineDate, "dd.MM.yyyy")
              : job.deadlineType}
          </>
        }
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/deals?tab=work">
            Назад к сделкам
          </Link>
        }
        actions={
          <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
            {jobStatusBadge.label}
          </Badge>
        }
      />
      <Link className="text-sm text-primary hover:underline" href={`/jobs/${job.id}`}>
        Открыть публичную карточку заказа
      </Link>


      {!user.creatorProfileId ? (
        <Alert variant="info" title="Профиль креатора не заполнен">
          Заполните профиль, чтобы бренды могли выбрать вас.
        </Alert>
      ) : null}

      {disputeOpen ? (
        <Alert variant="warning" title="Идёт спор">
          Спор открыт. Администратор рассматривает ситуацию.
        </Alert>
      ) : null}

      {disputeOpen && dispute ? (
        <Card>
          <CardHeader>
            <CardTitle>Спор</CardTitle>
            <CardDescription>Добавляйте пояснения и ссылки-доказательства.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DisputeMessageList messages={dispute.messages} viewerId={user.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <DisputeMessageForm disputeId={dispute.id} mode="message" />
              <DisputeMessageForm disputeId={dispute.id} mode="evidence" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Эскроу</CardTitle>
          <CardDescription>Оплата за заказ поступает после приёмки.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!job.escrow ? (
            <Alert variant="warning" title="Эскроу не создан">
              Эскроу появится после принятия отклика брендом.
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                Статус:
                {escrowStatusBadge ? (
                  <Badge variant={escrowStatusBadge.variant} tone={escrowStatusBadge.tone}>
                    {escrowStatusBadge.label}
                  </Badge>
                ) : null}
              </div>
              <div className="text-muted-foreground">
                Сумма (в вашей валюте):{" "}
                <span className="text-foreground font-medium">{Math.round(escrowAmountCents / 100)}</span>{" "}
                {payoutCurrencyLabel}
              </div>
              {job.escrow.status === "UNFUNDED" ? (
                <Alert variant="warning" title="Эскроу не пополнен">
                  Бренд ещё не пополнил эскроу — начало работы на ваш риск.
                </Alert>
              ) : job.escrow.status === "FUNDED" ? (
                <Alert variant="success" title="Эскроу пополнен">
                  Оплата зарезервирована и будет выплачена после приёмки.
                </Alert>
              ) : job.escrow.status === "RELEASED" ? (
                <Alert variant="success" title="Оплата начислена">
                  Баланс пополнен, вы можете запросить выплату.
                </Alert>
              ) : (
                <Alert variant="info" title="Средства возвращены бренду">
                  Оплата по этой сделке возвращена бренду.
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {canOpenDispute ? (
        <Card>
          <CardHeader>
            <CardTitle>Открыть спор</CardTitle>
            <CardDescription>Если возник конфликт, можно эскалировать его администратору.</CardDescription>
          </CardHeader>
          <CardContent>
            <DisputeOpenForm jobId={job.id} />
          </CardContent>
        </Card>
      ) : null}

      {job.status === "CANCELED" ? (
        <Alert variant="warning" title="Сделка отменена">
          {job.cancelReason ? <p className="text-sm text-muted-foreground">{job.cancelReason}</p> : null}
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Отправить материалы</CardTitle>
            <CardDescription>
              Прикрепите ссылки на готовые материалы. Новая версия создаётся при каждом отправлении.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubmissionForm jobId={job.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Заказ</CardTitle>
          <CardDescription>Кратко: форматы, права, что отдавать.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            Форматы:{" "}
            {(job.contentFormats ?? []).length
              ? job.contentFormats.map((f) => CONTENT_FORMAT_LABELS[f]).join(", ")
              : "не указано"}
          </div>
          <div>Прав: {RIGHTS_PACKAGE_LABELS[job.rightsPackage]} · срок {job.usageTermDays ?? "—"} дн.</div>
          <div>Правки включены: {job.revisionRoundsIncluded} (макс. {job.revisionRounds})</div>
          <div>Исходники: {job.deliverablesIncludeRaw ? "да" : "нет"} · Проектный файл: {job.deliverablesIncludeProjectFile ? "да" : "нет"}</div>
          <div>Субтитры: {job.subtitlesRequired ? "нужны" : "не нужны"} · Музыка: {job.musicPolicy ?? "не указано"}</div>
          <div>Сценарий: {job.scriptProvided ? "бренд дает" : "нужен от креатора"}</div>
          {job.notes ? <div>Примечания: {job.notes}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>История версий</CardTitle>
          <CardDescription>Последние сдачи материалов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {job.submissions.length === 0 ? (
            <EmptyState title="Пока нет сдач" description="Отправьте первую версию материалов." />
          ) : (
            job.submissions.map((submission) => (
              <div key={submission.id} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">Версия {submission.version}</span>
                  <Badge
                    variant={getSubmissionStatusBadge(submission.status).variant}
                    tone={getSubmissionStatusBadge(submission.status).tone}
                  >
                    {getSubmissionStatusBadge(submission.status).label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(submission.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                  </span>
                </div>
                {submission.note ? (
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{submission.note}</p>
                ) : null}
                <div className="mt-2 space-y-1">
                  {submission.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-2">
                      <Badge variant="soft">{item.type}</Badge>
                      <a className="text-primary hover:underline break-all" href={item.url} target="_blank" rel="noreferrer">
                        {item.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </Container>
  );
}




