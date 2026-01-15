import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewActions } from "@/components/work/review-actions";
import { EscrowFundButton } from "@/components/escrow/escrow-fund-button";
import { CURRENCY_LABELS } from "@/lib/constants";
import { computeCommission, computeCreatorPayout } from "@/lib/payments";
import { getPlatformSettings } from "@/lib/platform-settings";
import { CancelDealButton } from "@/components/jobs/cancel-deal-button";
import { DisputeOpenForm } from "@/components/disputes/dispute-open-form";
import { DisputeMessageForm } from "@/components/disputes/dispute-message-form";
import { DisputeMessageList } from "@/components/disputes/dispute-message-list";
import { isBrandOwner } from "@/lib/authz";
import { getEscrowStatusBadge, getJobStatusBadge, getSubmissionStatusBadge } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

export default async function JobReviewPage({ params }: { params: { id: string } }) {
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
      submissions: { orderBy: { version: "desc" }, include: { items: true } },
      brand: { select: { id: true } },
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

  if (!job || !isBrandOwner(user, job.brandId)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Заказ не найден или принадлежит другому бренду.
        </Alert>
      </div>
    );
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      href: `/dashboard/jobs/${job.id}/review`,
    },
    data: { isRead: true },
  });

  const lastSubmission = job.submissions[0];
  const canReview = lastSubmission && lastSubmission.status === "SUBMITTED";
  const escrow = job.escrow;
  const escrowAmount = escrow ? Math.round(escrow.amountCents / 100) : null;
  const settings = await getPlatformSettings();
  const commissionCents = escrow ? computeCommission(escrow.amountCents, settings.commissionBps) : null;
  const payoutCents = escrow ? computeCreatorPayout(escrow.amountCents, settings.commissionBps) : null;
  const currencyLabel = escrow ? CURRENCY_LABELS[escrow.currency] ?? escrow.currency : "";
  const dispute = job.dispute;
  const disputeOpen = dispute?.status === "OPEN";
  const canOpenDispute =
    !disputeOpen && job.status !== "COMPLETED" && job.status !== "CANCELED" && Boolean(job.activeCreatorId);
  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
  const escrowStatusBadge = escrow ? getEscrowStatusBadge(escrow.status) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/jobs">
            Назад к заказам
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="text-sm text-muted-foreground">Статус: {jobStatusBadge.label}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link className="text-primary hover:underline" href={`/dashboard/jobs/${job.id}/applications`}>
              Отклики
            </Link>
            <Link className="text-primary hover:underline" href={`/jobs/${job.id}`}>
              Открыть заказ
            </Link>
          </div>
        </div>
        <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
          {jobStatusBadge.label}
        </Badge>
      </div>

      {disputeOpen ? (
        <Alert variant="warning" title="Идёт спор">
          Спор открыт. Приёмка и отмена сделки временно недоступны - решение принимает админ.
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
          <CardDescription>Пополните эскроу, чтобы гарантировать выплату креатору.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!escrow ? (
            <Alert variant="warning" title="Эскроу не создан">
              Эскроу появится после принятия отклика.
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Статус:</span>
                {escrowStatusBadge ? (
                  <Badge variant={escrowStatusBadge.variant} tone={escrowStatusBadge.tone}>
                    {escrowStatusBadge.label}
                  </Badge>
                ) : null}
              </div>
              <div>
                Сумма: <span className="font-medium text-foreground">{escrowAmount}</span> {currencyLabel}
              </div>
              <div>
                Комиссия: {commissionCents !== null ? Math.round(commissionCents / 100) : "-"} {currencyLabel}
              </div>
              <div>
                Выплата креатору: {payoutCents !== null ? Math.round(payoutCents / 100) : "-"} {currencyLabel}
              </div>
              {escrow.status === "UNFUNDED" ? (
                <Alert variant="warning" title="Эскроу не пополнен">
                  <p className="text-sm text-muted-foreground">
                    Средства не зарезервированы. Пополните эскроу, чтобы креатор мог безопасно работать.
                  </p>
                  <div className="mt-3">
                    <EscrowFundButton jobId={job.id} />
                  </div>
                </Alert>
              ) : escrow.status === "FUNDED" ? (
                <Alert variant="success" title="Эскроу пополнен">
                  Средства зарезервированы и будут выплачены после приёмки.
                </Alert>
              ) : escrow.status === "RELEASED" ? (
                <Alert variant="success" title="Эскроу завершён">
                  Выплата креатору выполнена.
                </Alert>
              ) : (
                <Alert variant="info" title="Эскроу возвращён">
                  Средства возвращены бренду.
                </Alert>
              )}
              {job.status !== "COMPLETED" && job.status !== "CANCELED" && !disputeOpen ? (
                <div className="pt-2">
                  <CancelDealButton jobId={job.id} />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сдачи материалов</CardTitle>
          <CardDescription>Последние версии от креатора.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {job.submissions.length === 0 ? (
            <Alert variant="info" title="Пока нет сдач">
              Ожидаем первую версию от креатора.
            </Alert>
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

      {job.status === "COMPLETED" ? (
        <Alert variant="success" title="Заказ завершён">
          Материалы приняты.
        </Alert>
      ) : disputeOpen ? (
        <Alert variant="info" title="Приёмка временно недоступна">
          Спор открыт — решение принимает администратор.
        </Alert>
      ) : canReview ? (
        <Card>
          <CardHeader>
            <CardTitle>Приёмка</CardTitle>
            <CardDescription>Одобрите сдачу или верните на доработку.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewActions jobId={job.id} />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="info" title="Нет сдачи для проверки">
          Ожидаем новую версию от креатора.
        </Alert>
      )}

      {canOpenDispute ? (
        <Card>
          <CardHeader>
            <CardTitle>Открыть спор</CardTitle>
            <CardDescription>Если возник конфликт по заказу, эскалируйте его администратору.</CardDescription>
          </CardHeader>
          <CardContent>
            <DisputeOpenForm jobId={job.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
