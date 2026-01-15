import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export default async function BrandPublicProfile({ params }: { params: { id: string } }) {
  const brand = await prisma.brandProfile.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      companyName: true,
      website: true,
      description: true,
    },
  });

  if (!brand) return notFound();

  const reviewStats = await prisma.review.aggregate({
    where: { toUserId: brand.userId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const recentReviews = await prisma.review.findMany({
    where: { toUserId: brand.userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      job: { select: { title: true } },
    },
  });

  const averageRating =
    reviewStats._count._all > 0 ? reviewStats._avg.rating?.toFixed(1) ?? "-" : "-";

  const websiteUrl = brand.website ? normalizeUrl(brand.website) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <Link className="text-sm text-muted-foreground hover:text-foreground" href="/jobs">
        ← К заказам
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{brand.companyName}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Публичный профиль бренда</span>
          <Badge variant="soft">Рейтинг: {averageRating}</Badge>
          <Badge variant="soft">Отзывов: {reviewStats._count._all}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация</CardTitle>
          <CardDescription>Данные, доступные публично.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <span className="text-foreground">Компания:</span> {brand.companyName}
          </div>
          {websiteUrl ? (
            <div>
              <span className="text-foreground">Сайт:</span>{" "}
              <a className="text-primary hover:underline break-all" href={websiteUrl} target="_blank" rel="noreferrer">
                {brand.website}
              </a>
            </div>
          ) : (
            <div>
              <span className="text-foreground">Сайт:</span> —
            </div>
          )}
          {brand.description ? (
            <div className="space-y-1">
              <span className="text-foreground">Описание:</span>
              <p className="whitespace-pre-wrap">{brand.description}</p>
            </div>
          ) : (
            <div>
              <span className="text-foreground">Описание:</span> не заполнено
            </div>
          )}
        </CardContent>
      </Card>

      <Alert variant="info" title="Контакт через заказы">
        Для общения используйте отклики или приглашения в заказах.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Отзывы о бренде</CardTitle>
          <CardDescription>Последние отзывы креаторов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {recentReviews.length === 0 ? (
            <Alert variant="info" title="Пока нет отзывов">
              Отзывы появятся после завершенных сделок.
            </Alert>
          ) : (
            recentReviews.map((review) => (
              <div key={review.id} className="rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="soft">{review.rating}/5</Badge>
                  <span className="text-xs">
                    {formatDistanceToNow(review.createdAt, { addSuffix: true, locale: ru })}
                  </span>
                  {review.job?.title ? <span className="text-xs">· {review.job.title}</span> : null}
                </div>
                {review.text ? <p className="mt-2 text-muted-foreground">{review.text}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
