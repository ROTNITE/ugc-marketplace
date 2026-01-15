import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatorFilters } from "@/components/creators/creator-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import {
  buildCreatorWhere,
  buildCreatorOrderBy,
  buildCreatorCursorWhere,
  parseCreatorListFilters,
  type CreatorCursor,
} from "@/lib/creators/filters";
import { PLATFORM_LABELS, NICHE_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { getVerificationStatusBadge } from "@/lib/status-badges";
import { decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const parsedFilters = parseCreatorListFilters(searchParams);
  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<CreatorCursor>(parseCursor(searchParams));
  const effectiveFilters = {
    ...parsedFilters,
    verifiedOnly: isAdmin ? parsedFilters.verifiedOnly : true,
  };

  const where = buildCreatorWhere(effectiveFilters, !isAdmin, !isAdmin);
  const cursorWhere = buildCreatorCursorWhere(effectiveFilters, cursor);
  if (cursorWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
  }

  const creatorResult = await prisma.creatorProfile.findMany({
    where,
    orderBy: buildCreatorOrderBy(effectiveFilters),
    take: limit + 1,
    include: {
      user: { select: { name: true } },
      portfolioItems: { select: { id: true, url: true }, take: 2 },
    },
  });

  const paged = sliceWithNextCursor(creatorResult, limit, (creator) => ({
    id: creator.id,
    updatedAt: creator.updatedAt.toISOString(),
    pricePerVideo: creator.pricePerVideo,
    ratingAvg: creator.ratingAvg,
  }));
  const creators = paged.items;
  const nextCursor = paged.nextCursor;

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

  const creatorUserIds = creators.map((creator) => creator.userId);
  const reviewStats = creatorUserIds.length
    ? await prisma.review.groupBy({
        by: ["toUserId"],
        where: { toUserId: { in: creatorUserIds } },
        _avg: { rating: true },
        _count: { _all: true },
      })
    : [];
  const statsByUserId = new Map(
    reviewStats.map((stat) => [stat.toUserId, { avg: stat._avg.rating, count: stat._count._all }]),
  );

  return (
    <Container className="py-10 space-y-8">
      <PageHeader
        title="Креаторы"
        description="Подберите исполнителя по нишам, платформам и бюджету. По умолчанию показываем только публичные и верифицированные профили."
      />

      <CreatorFilters canShowUnverified={isAdmin} />

      {creators.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить фильтры или сбросить поиск."
          action={
            <Link href="/creators">
              <Button variant="outline" size="sm">
                Сбросить фильтры
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {creators.map((creator) => {
              const name = creator.user?.name || "Креатор";
              const languages = creator.languages?.length ? creator.languages.join(", ") : "-";
              const platforms = creator.platforms?.length
                ? creator.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")
                : "-";
              const niches = creator.niches?.length
                ? creator.niches.map((n) => NICHE_LABELS[n] ?? n).join(", ")
                : "-";
              const portfolioLinks = creator.portfolioItems?.map((item) => item.url).filter(Boolean);
              const stats = statsByUserId.get(creator.userId);
              const ratingLabel =
                stats && stats.count ? `${stats.avg?.toFixed(1) ?? "-"} (${stats.count})` : "-";
              const verificationBadge = getVerificationStatusBadge(creator.verificationStatus);

              return (
                <Card key={creator.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <CardDescription>Публичный профиль</CardDescription>
                    </div>
                    <Badge variant={verificationBadge.variant} tone={verificationBadge.tone}>
                      {verificationBadge.label}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Языки:</span> {languages}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Платформы:</span> {platforms}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ниши:</span> {niches}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ставка:</span>{" "}
                      {creator.pricePerVideo
                        ? `${creator.pricePerVideo} ${CURRENCY_LABELS[creator.currency] ?? creator.currency}`
                        : "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Рейтинг:</span> {ratingLabel}
                    </div>
                    {portfolioLinks?.length ? (
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Портфолио:</span>
                        {portfolioLinks.map((link) => (
                          <div key={link}>
                            <a className="text-primary hover:underline break-all" href={link} target="_blank" rel="noreferrer">
                              {link}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="pt-2">
                      <Link href={`/creators/${creator.id}`}>
                        <Button size="sm">Открыть профиль</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`/creators?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
