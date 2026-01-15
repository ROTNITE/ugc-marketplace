import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  PLATFORM_LABELS,
  NICHE_LABELS,
  RIGHTS_PACKAGE_LABELS,
  CURRENCY_LABELS,
  CONTENT_FORMAT_LABELS,
} from "@/lib/constants";
import { format } from "date-fns";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { JobApplyForm } from "@/components/jobs/job-apply-form";
import { Alert } from "@/components/ui/alert";
import { WithdrawButton } from "@/components/applications/withdraw-button";
import { Button } from "@/components/ui/button";
import { JobResubmitButton } from "@/components/jobs/job-resubmit-button";
import { JobPauseToggle, JobDuplicateButton } from "@/components/jobs/job-actions";
import { getJobForViewerOrThrow } from "@/lib/jobs/visibility";
import { prisma } from "@/lib/prisma";
import { getBrandIds, getCreatorIds } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";
import { getApplicationStatusBadge, getJobStatusBadge, getModerationStatusBadge } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

const DEADLINE_LABELS: Record<string, string> = {
  URGENT_48H: "Срочно (48ч)",
  DAYS_3_5: "3-5 дней",
  WEEK_PLUS: "Неделя+",
  DATE: "Дата",
};

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value,
  );
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) return notFound();

  const session = await getServerSession(authOptions);
  const user = session?.user;

  const job = await getJobForViewerOrThrow({
    jobId: params.id,
    viewer: user
      ? {
          userId: user.id,
          role: user.role,
          brandProfileId: user.brandProfileId,
          creatorProfileId: user.creatorProfileId,
        }
      : null,
    include: {
      brand: { include: { brandProfile: true } },
      applications: { select: { id: true, creatorId: true, createdAt: true } },
    },
  });

  const brandIds = user ? getBrandIds(user) : [];
  const creatorIds = user ? getCreatorIds(user) : [];
  const isOwnerBrand = !!user && user.role === "BRAND" && brandIds.includes(job.brandId);
  const brandLabel = job.brand.brandProfile?.companyName ?? job.brand.name ?? "Бренд";
  const brandProfileId = job.brand.brandProfile?.id ?? null;
  const canEdit =
    isOwnerBrand && !job.activeCreatorId && job.status !== "COMPLETED" && job.status !== "CANCELED";
  const canPause = isOwnerBrand && !job.activeCreatorId && job.status === "PUBLISHED";
  const canUnpause = isOwnerBrand && !job.activeCreatorId && job.status === "PAUSED";
  const canDuplicate = isOwnerBrand && job.status !== "COMPLETED" && job.status !== "CANCELED";

  const isCreator = !!user && user.role === "CREATOR";
  const creatorProfile = isCreator
    ? await prisma.creatorProfile.findUnique({
        where: { userId: user!.id },
        include: { portfolioItems: { select: { url: true } } },
      })
    : null;
  const creatorCompleteness = creatorProfile
    ? getCreatorCompleteness({
        displayName: user?.name ?? "",
        bio: creatorProfile.bio,
        platforms: creatorProfile.platforms,
        portfolioLinks: creatorProfile.portfolioItems.map((item) => item.url).filter(Boolean),
        pricePerVideo: creatorProfile.pricePerVideo ?? null,
      })
    : null;
  const creatorProfileIncomplete = Boolean(
    isCreator && creatorProfile && creatorCompleteness && creatorCompleteness.missing.length > 0,
  );

  const jobStatusBadge = getJobStatusBadge(job.status, { activeCreatorId: job.activeCreatorId });
  const moderationBadge = getModerationStatusBadge(job.moderationStatus);
  const alreadyApplied = isCreator
    ? creatorIds.length <= 1
      ? await prisma.application.findUnique({
          where: { jobId_creatorId: { jobId: job.id, creatorId: creatorIds[0] ?? user!.id } },
          select: {
            id: true,
            status: true,
            message: true,
            priceQuote: true,
          },
        })
      : await prisma.application.findFirst({
          where: { jobId: job.id, creatorId: { in: creatorIds } },
          select: { id: true, status: true, message: true, priceQuote: true },
        })
    : null;

  const applicationBadge = alreadyApplied ? getApplicationStatusBadge(alreadyApplied.status) : null;
  const conversation = alreadyApplied?.status === "ACCEPTED"
    ? await prisma.conversation.findFirst({
        where: { jobId: job.id, participants: { some: { userId: user!.id } } },
        select: { id: true },
      })
    : null;

  return (
    <Container size="md" className="py-10 space-y-6">
          <PageHeader
        title={job.title}
        description={
          <>
            Бренд: {" "}
            {brandProfileId ? (
              <Link className="text-primary hover:underline" href={`/brands/${brandProfileId}`}>
                {brandLabel}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{brandLabel}</span>
            )}{" "}
            · Бюджет: {" "}
            <span className="text-foreground font-medium">
              {job.budgetMin}-{job.budgetMax} {CURRENCY_LABELS[job.currency]}
            </span>{" "}
            · Дедлайн: {" "}
            <span className="text-foreground font-medium">
              {job.deadlineType === "DATE" && job.deadlineDate
                ? format(job.deadlineDate, "dd.MM.yyyy")
                : DEADLINE_LABELS[job.deadlineType] ?? "не указан"}
            </span>
          </>
        }
        eyebrow={
          <Link className="hover:text-foreground" href="/jobs">
            К списку заказов
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant="soft">{PLATFORM_LABELS[job.platform]}</Badge>
        <Badge variant="soft">{NICHE_LABELS[job.niche]}</Badge>
        <Badge variant="soft">{RIGHTS_PACKAGE_LABELS[job.rightsPackage]}</Badge>
        <Badge variant={jobStatusBadge.variant} tone={jobStatusBadge.tone}>
          {jobStatusBadge.label}
        </Badge>
      </div>
      {isOwnerBrand ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={moderationBadge.variant} tone={moderationBadge.tone}>
              Модерация: {moderationBadge.label}
            </Badge>
          </div>
          {job.moderationStatus === "PENDING" ? (
            <Alert variant="info" title="На модерации">
              <p>Заказ появится в ленте после одобрения модератора.</p>
            </Alert>
          ) : null}
          {job.moderationStatus === "REJECTED" ? (
            <Alert variant="warning" title="Отклонено модерацией">
              <div className="space-y-2 text-sm">
                <p>{job.moderationReason ?? "Причина не указана."}</p>
                <JobResubmitButton jobId={job.id} />
              </div>
            </Alert>
          ) : null}
          {job.moderationStatus === "APPROVED" ? (
            <Alert variant="success" title="Одобрено">
              <p>Заказ в ленте и доступен креаторам.</p>
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <Link href={`/dashboard/jobs/${job.id}/edit`}>
                <Button size="sm">Редактировать</Button>
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">
                Нельзя редактировать после выбора исполнителя или завершения.
              </p>
            )}
            {canDuplicate ? <JobDuplicateButton jobId={job.id} /> : null}
            {canPause || canUnpause ? <JobPauseToggle jobId={job.id} status={job.status} /> : null}
          </div>
          </div>
        ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Описание" description="ТЗ и детали заказа" className="md:col-span-2">
          <div className="space-y-4 text-sm">
            {job.description ? (
              <p className="whitespace-pre-wrap">{job.description}</p>
            ) : (
              <p className="text-muted-foreground">Описание не указано.</p>
            )}

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div>
                <span className="text-muted-foreground">Количество:</span>{" "}
                <span className="font-medium">{job.deliverablesCount} видео</span>
              </div>
              <div>
                <span className="text-muted-foreground">Длительность:</span>{" "}
                <span className="font-medium">{job.videoDurationSec} сек</span>
              </div>
              <div>
                <span className="text-muted-foreground">Форматы:</span>{" "}
                <span className="font-medium">
                  {(job.contentFormats?.length ?? 0) > 0
                    ? job.contentFormats.map((f) => CONTENT_FORMAT_LABELS[f]).join(", ")
                    : "не указано"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Языки:</span>{" "}
                <span className="font-medium">{job.languages.join(", ")}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Доставка продукта:</span>{" "}
                <span className="font-medium">{job.shippingRequired ? "нужна" : "не нужна"}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="font-medium text-foreground">Права и публикация</div>
              <div className="text-muted-foreground">
                {RIGHTS_PACKAGE_LABELS[job.rightsPackage]} · срок {job.usageTermDays ?? "—"} дн. · правок включено{" "}
                {job.revisionRoundsIncluded} (макс. {job.revisionRounds})
              </div>
              <div className="text-muted-foreground">
                Публикация у креатора: {job.needsPosting ? "да" : "нет"} · Whitelisting:{" "}
                {job.needsWhitelisting ? "да" : "нет"}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
              <div className="font-medium text-foreground">Что отдавать</div>
              <div className="text-muted-foreground">
                Исходники: {job.deliverablesIncludeRaw ? "да" : "нет"} · Проектный файл:{" "}
                {job.deliverablesIncludeProjectFile ? "да" : "нет"}
              </div>
              <div className="text-muted-foreground">
                Субтитры: {job.subtitlesRequired ? "нужны" : "не нужны"} · Музыка: {job.musicPolicy ?? "не указано"}
              </div>
              <div className="text-muted-foreground">
                Сценарий: {job.scriptProvided ? "бренд дает" : "нужен от креатора"}
              </div>
              {job.notes ? <div className="text-muted-foreground whitespace-pre-wrap">Примечания: {job.notes}</div> : null}
            </div>

            <Alert variant="info" title="Права и disclosure (важно)">
              <div className="space-y-1">
                <p>
                  В дальнейших версиях мы добавим автоматизацию разрешений (Spark/Partnership) и шаблоны
                  договорённостей. Пока фиксируйте условия в чате и в переписке.
                </p>
              </div>
            </Alert>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Бренд" description="Кто разместил заказ">
            <div className="text-sm space-y-2">
              <div className="font-medium text-foreground">{brandLabel}</div>
              <div className="text-muted-foreground">{job.brand.brandProfile?.website ?? "-"}</div>
              {job.brand.brandProfile?.description ? (
                <div className="text-muted-foreground whitespace-pre-wrap">{job.brand.brandProfile.description}</div>
              ) : null}

              {isOwnerBrand ? (
                <Link className="text-primary hover:underline" href="/dashboard/jobs">
                  Управлять заказами
                </Link>
              ) : null}
              {!isOwnerBrand && brandProfileId ? (
                <Link className="text-primary hover:underline" href={`/brands/${brandProfileId}`}>
                  Открыть профиль бренда
                </Link>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Отклик" description="Отправьте заявку на заказ">
            <div>
              {!user ? (
                <Alert variant="info" title="Нужен вход">
                  <Link className="text-primary hover:underline" href={`/login?next=/jobs/${job.id}`}>
                    Войти, чтобы откликнуться
                  </Link>
                </Alert>
              ) : user.role !== "CREATOR" ? (
                <Alert variant="warning" title="Только для креаторов">
                  Откликаться на заказы могут только аккаунты креаторов.
                </Alert>
              ) : !user.creatorProfileId ? (
                <Alert variant="warning" title="Профиль не заполнен">
                  Заполните профиль креатора, чтобы откликаться на заказы.
                </Alert>
              ) : creatorProfileIncomplete ? (
                <Alert variant="warning" title="Профиль не заполнен">
                  <div className="space-y-2">
                    <p>Заполните профиль, чтобы откликаться на заказы.</p>
                    {creatorCompleteness?.missing.length ? (
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {creatorCompleteness.missing.map((item) => (
                          <li key={item.key}>{item.label}</li>
                        ))}
                      </ul>
                    ) : null}
                    <Link className="text-primary hover:underline text-sm" href="/dashboard/profile">
                      Перейти в профиль
                    </Link>
                  </div>
                </Alert>
              ) : alreadyApplied ? (
                <div className="space-y-3">
                  <Alert variant="success" title="Вы уже откликнулись">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Статус:</span>
                      {applicationBadge ? (
                        <Badge variant={applicationBadge.variant} tone={applicationBadge.tone}>
                          {applicationBadge.label}
                        </Badge>
                      ) : null}
                    </div>
                  </Alert>

                  {alreadyApplied.status === "PENDING" ? (
                    <WithdrawButton applicationId={alreadyApplied.id} />
                  ) : null}

                  {alreadyApplied.status === "ACCEPTED" ? (
                    conversation ? (
                      <Link href={`/dashboard/inbox/${conversation.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          Перейти в чат
                        </Button>
                      </Link>
                    ) : (
                      <Alert variant="info" title="Чат пока не создан">
                        Бренд подключит диалог после подтверждения отклика.
                      </Alert>
                    )
                  ) : null}
                </div>
                ) : (
                  <JobApplyForm jobId={job.id} />
                )}
            </div>
          </SectionCard>

          {isOwnerBrand ? (
            <SectionCard title="Отклики" description="В MVP - пока без детальной витрины">
              <div className="text-sm text-muted-foreground">
                Сейчас откликов: <span className="text-foreground font-medium">{job.applications.length}</span>
                <div className="mt-2">
                  В следующих итерациях появится страница с откликами, чатом и выбором исполнителя.
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </Container>
  );
}



