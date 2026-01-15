import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Stat } from "@/components/ui/stat";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    pendingJobs,
    pendingCreators,
    pendingPayouts,
    openDisputes,
    unprocessedEvents,
    manualAdjustments,
    recentEvents,
  ] = await Promise.all([
    prisma.job.count({ where: { moderationStatus: "PENDING" } }),
    prisma.creatorProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.dispute.count({ where: { status: "OPEN" } }),
    prisma.outboxEvent.count({ where: { processedAt: null } }),
    prisma.ledgerEntry.count({ where: { type: "MANUAL_ADJUSTMENT", createdAt: { gte: since } } }),
    prisma.outboxEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, createdAt: true },
    }),
  ]);

  return (
    <Container className="py-10 space-y-6" motion>
      <PageHeader
        title="Админ-панель"
        description="Ключевые очереди в одной панели."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/jobs?status=PENDING" className="block" aria-label="Модерация заказов">
          <SectionCard title="Модерация заказов" description="Проверка и одобрение публикаций" className="transition hover:border-primary/50">
            <Stat label="На модерации" value={pendingJobs} />
          </SectionCard>
        </Link>

        <Link href="/admin/creators?status=PENDING" className="block" aria-label="Верификация креаторов">
          <SectionCard title="Верификация креаторов" description="Проверка профилей" className="transition hover:border-primary/50">
            <Stat label="На проверке" value={pendingCreators} />
          </SectionCard>
        </Link>

        <Link href="/admin/payouts?status=PENDING" className="block" aria-label="Выплаты">
          <SectionCard title="Выплаты" description="Заявки на вывод средств" className="transition hover:border-primary/50">
            <Stat label="На обработке" value={pendingPayouts} />
          </SectionCard>
        </Link>

        <Link href="/admin/disputes?status=OPEN" className="block" aria-label="Споры">
          <SectionCard title="Споры" description="Открытые конфликты" className="transition hover:border-primary/50">
            <Stat label="Открыто" value={openDisputes} />
          </SectionCard>
        </Link>

        <Link href="/admin/events?processed=unprocessed" className="block" aria-label="Outbox">
          <SectionCard title="Outbox" description="Необработанные события" className="transition hover:border-primary/50">
            <Stat label="Не обработано" value={unprocessedEvents} />
          </SectionCard>
        </Link>

        <Link href="/admin/finance?type=MANUAL_ADJUSTMENT" className="block" aria-label="Корректировки">
          <SectionCard title="Корректировки" description="Ручные корректировки" className="transition hover:border-primary/50">
            <Stat label="За 7 дней" value={manualAdjustments} />
          </SectionCard>
        </Link>
      </div>

      <SectionCard
        title="Последние события"
        description="Последние 10 событий outbox."
        actions={
          <Link className="text-primary hover:underline text-sm" href="/admin/events">
            Открыть события
          </Link>
        }
      >
        {recentEvents.length === 0 ? (
          <Alert variant="info" title="Нет событий">
            События появятся после активности в системе.
          </Alert>
        ) : (
          <div className="space-y-2 text-sm">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                <div className="font-medium text-foreground">{event.type}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(event.createdAt, { addSuffix: true, locale: ru })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </Container>
  );
}
