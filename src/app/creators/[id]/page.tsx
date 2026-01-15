import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { PLATFORM_LABELS, NICHE_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { InviteCreatorDialog } from "@/components/creators/invite-creator-dialog";
import { getBrandIds } from "@/lib/authz";
import { getVerificationStatusBadge } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

const LANG_LABELS: Record<string, string> = { ru: "RU", uk: "UK", en: "EN" };

export default async function CreatorProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN";
  const isBrand = user?.role === "BRAND";

  const creator = await prisma.creatorProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true } },
      portfolioItems: { select: { id: true, url: true, title: true, platform: true } },
    },
  });

  if (!creator) return notFound();
  if (!isAdmin && (!creator.isPublic || creator.verificationStatus !== "VERIFIED")) return notFound();

  const brandJobs =
    isBrand && user
      ? await prisma.job.findMany({
          where: {
            brandId: { in: getBrandIds(user) },
            status: "PUBLISHED",
            moderationStatus: { not: "REJECTED" },
          },
          select: { id: true, title: true },
          orderBy: { updatedAt: "desc" },
          take: 50,
        })
      : [];

  const reviewStats = await prisma.review.aggregate({
    where: { toUserId: creator.userId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const recentReviews = await prisma.review.findMany({
    where: { toUserId: creator.userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, rating: true, text: true, createdAt: true, job: { select: { title: true } } },
  });

  const name = creator.user?.name || "Креатор";
  const languages = creator.languages?.length
    ? creator.languages.map((l) => LANG_LABELS[l] ?? l).join(", ")
    : "—";
  const platforms = creator.platforms?.length
    ? creator.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")
    : "—";
  const niches = creator.niches?.length
    ? creator.niches.map((n) => NICHE_LABELS[n] ?? n).join(", ")
    : "—";
  const price = creator.pricePerVideo
    ? `${creator.pricePerVideo} ${CURRENCY_LABELS[creator.currency] ?? creator.currency}`
    : "—";
  const ratingLabel =
    reviewStats._count._all > 0
      ? `${reviewStats._avg.rating?.toFixed(1) ?? "-"} (${reviewStats._count._all})`
      : "-";
  const verificationBadge =
    creator.verificationStatus === "VERIFIED" ? getVerificationStatusBadge(creator.verificationStatus) : null;

  return (
    <Container size="lg" className="py-10 space-y-6">
      <PageHeader
        title={name}
        description="Публичный профиль креатора"
        eyebrow={
          <Link className="hover:text-foreground" href="/creators">
            К каталогу креаторов
          </Link>
        }
        actions={
          verificationBadge ? (
            <Badge variant={verificationBadge.variant} tone={verificationBadge.tone}>
              {verificationBadge.label}
            </Badge>
          ) : null
        }
      />


      {creator.bio ? (
        <Card>
          <CardHeader>
            <CardTitle>О себе</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{creator.bio}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Основное</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="text-foreground">Платформы: </span>
              {platforms}
            </div>
            <div>
              <span className="text-foreground">Ниши: </span>
              {niches}
            </div>
            <div>
              <span className="text-foreground">Языки: </span>
              {languages}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Условия</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              <span className="text-foreground">Ставка за видео: </span>
              {price}
            </div>
            <div>
              <span className="text-foreground">Рейтинг:</span> {ratingLabel}
            </div>
            <div>
              <span className="text-foreground">Завершено заказов:</span> {creator.jobsCompleted ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Портфолио</CardTitle>
          <CardDescription>Ссылки на примеры работ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {creator.portfolioItems.length === 0 ? (
            <EmptyState title="Пока пусто" description="Креатор ещё не добавил ссылки на работы." />
          ) : (
            creator.portfolioItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <div className="space-y-1">
                  {item.title ? <div className="text-sm font-medium">{item.title}</div> : null}
                  <a className="text-primary hover:underline break-all text-sm" href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                </div>
                {item.platform ? <Badge variant="soft">{item.platform}</Badge> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Отзывы</CardTitle>
          <CardDescription>Последние 3 отзыва о работе креатора.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReviews.length === 0 ? (
            <EmptyState title="Пока без отзывов" description="Отзывы появятся после завершенных заказов." />
          ) : (
            recentReviews.map((review) => (
              <div key={review.id} className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge variant="soft">{review.rating}/5</Badge>
                  <span>По заказу: {review.job.title}</span>
                  <span className="text-xs">{review.createdAt.toLocaleDateString("ru-RU")}</span>
                </div>
                {review.text ? <p className="mt-2 text-muted-foreground">{review.text}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {isBrand ? <InviteCreatorDialog creatorId={creator.userId} jobs={brandJobs} /> : null}
    </Container>
  );
}
