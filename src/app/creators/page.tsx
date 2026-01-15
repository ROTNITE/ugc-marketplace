import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatorFilters } from "@/components/creators/creator-filters";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildCreatorWhere, buildCreatorOrderBy, parseCreatorListFilters } from "@/lib/creators/filters";
import { PLATFORM_LABELS, NICHE_LABELS, CURRENCY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const parsedFilters = parseCreatorListFilters(searchParams);
  const effectiveFilters = {
    ...parsedFilters,
    verifiedOnly: isAdmin ? parsedFilters.verifiedOnly : true,
  };

  const creators = await prisma.creatorProfile.findMany({
    where: buildCreatorWhere(effectiveFilters, !isAdmin, !isAdmin),
    orderBy: buildCreatorOrderBy(effectiveFilters),
    take: 100,
    include: {
      user: { select: { name: true } },
      portfolioItems: { select: { id: true, url: true }, take: 2 },
    },
  });

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
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Креаторы</h1>
        <p className="text-muted-foreground">
          Подберите исполнителя по нишам, платформам и бюджету. По умолчанию показываем только публичные и
          верифицированные профили.
        </p>
      </div>

      <CreatorFilters canShowUnverified={isAdmin} />

      {creators.length === 0 ? (
        <Alert variant="info" title="Ничего не найдено">
          Попробуйте изменить фильтры или сбросить поиск.
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {creators.map((creator) => {
            const name = creator.user?.name || "Креатор";
            const languages = creator.languages?.length ? creator.languages.join(", ") : "—";
            const platforms = creator.platforms?.length
              ? creator.platforms.map((p) => PLATFORM_LABELS[p] ?? p).join(", ")
              : "—";
            const niches = creator.niches?.length
              ? creator.niches.map((n) => NICHE_LABELS[n] ?? n).join(", ")
              : "—";
            const portfolioLinks = creator.portfolioItems?.map((item) => item.url).filter(Boolean);
            const stats = statsByUserId.get(creator.userId);
            const ratingLabel =
              stats && stats.count ? `${stats.avg?.toFixed(1) ?? "—"} (${stats.count})` : "—";

            return (
              <Card key={creator.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <CardDescription>Публичный профиль</CardDescription>
                  </div>
                  {creator.verificationStatus === "VERIFIED" ? <Badge variant="soft">VERIFIED</Badge> : null}
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
                      : "—"}
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
      )}
    </div>
  );
}
