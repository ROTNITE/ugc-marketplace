import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DisputeResolveActions } from "@/components/disputes/dispute-resolve-actions";
import { DisputeMessageForm } from "@/components/disputes/dispute-message-form";
import { DisputeMessageList } from "@/components/disputes/dispute-message-list";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminDisputeDetailPage({ params }: { params: { id: string } }) {
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

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только администраторам.
        </Alert>
      </div>
    );
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: {
      job: {
        include: {
          escrow: true,
          submissions: { orderBy: { version: "desc" }, take: 3, include: { items: true } },
        },
      },
      openedByUser: { select: { id: true, name: true, email: true, role: true } },
      resolvedByUser: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { authorUser: { select: { id: true, name: true } } },
      },
    },
  });

  if (!dispute) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Не найдено">
          Спор не найден.
        </Alert>
      </div>
    );
  }

  const job = dispute.job;
  const openedAt = format(dispute.createdAt, "dd.MM.yyyy HH:mm", { locale: ru });
  const resolvedAt = dispute.resolvedAt ? format(dispute.resolvedAt, "dd.MM.yyyy HH:mm", { locale: ru }) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin/disputes">
          Назад к списку споров
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Спор по заказу</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="soft">{dispute.status}</Badge>
          <span>Открыт: {openedAt}</span>
          {resolvedAt ? <span>Решён: {resolvedAt}</span> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Детали спора</CardTitle>
          <CardDescription>Причина и сообщение инициатора.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            Причина: <span className="text-foreground font-medium">{dispute.reason}</span>
          </div>
          <div className="text-muted-foreground">Роль инициатора: {dispute.openedByRole}</div>
          <div className="text-muted-foreground">
            Инициатор: {dispute.openedByUser?.name ?? dispute.openedByUser?.email ?? dispute.openedByUserId}
          </div>
          {dispute.message ? <div className="whitespace-pre-wrap text-muted-foreground">{dispute.message}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сообщения в споре</CardTitle>
          <CardDescription>История комментариев и доказательств.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DisputeMessageList messages={dispute.messages} viewerId={user.id} />
          {dispute.status === "OPEN" ? (
            <DisputeMessageForm disputeId={dispute.id} mode="admin-note" />
          ) : null}
        </CardContent>
      </Card>

      {job ? (
        <Card>
          <CardHeader>
            <CardTitle>Заказ</CardTitle>
            <CardDescription>Статус и связанный эскроу.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft">{job.status}</Badge>
              <Link className="text-primary hover:underline" href={`/jobs/${job.id}`}>
                Открыть заказ
              </Link>
            </div>
            {job.escrow ? (
              <div>
                Эскроу: <span className="text-foreground font-medium">{job.escrow.status}</span> · сумма{" "}
                {Math.round(job.escrow.amountCents / 100)} {job.escrow.currency}
              </div>
            ) : (
              <div>Эскроу не создан.</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {job?.submissions?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Сдачи</CardTitle>
            <CardDescription>Последние версии материалов.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {job.submissions.map((submission) => (
              <div key={submission.id} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">Версия {submission.version}</span>
                  <Badge variant="soft">{submission.status}</Badge>
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
            ))}
          </CardContent>
        </Card>
      ) : null}

      {dispute.status === "OPEN" ? (
        <Card>
          <CardHeader>
            <CardTitle>Решение</CardTitle>
            <CardDescription>Выберите исход: refund или release.</CardDescription>
          </CardHeader>
          <CardContent>
            <DisputeResolveActions disputeId={dispute.id} />
          </CardContent>
        </Card>
      ) : (
        <Alert variant="info" title="Спор решён">
          Решение: {dispute.resolution ?? "-"}
          {dispute.adminNote ? <p className="text-sm text-muted-foreground">{dispute.adminNote}</p> : null}
          {dispute.resolvedByUser ? (
            <p className="text-sm text-muted-foreground">
              Решил: {dispute.resolvedByUser.name ?? dispute.resolvedByUser.email}
            </p>
          ) : null}
        </Alert>
      )}
    </div>
  );
}

