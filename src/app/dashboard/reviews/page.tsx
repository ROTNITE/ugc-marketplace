import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "@/components/reviews/review-form";
import { getBrandIds, getCreatorIds } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
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

  if (user.role === "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Раздел отзывов доступен только брендам и креаторам.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </div>
    );
  }

  const brandIds = getBrandIds(user);
  const creatorIds = getCreatorIds(user);

  const reviewsReceived = await prisma.review.findMany({
    where: { toUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { job: { select: { title: true } } },
  });

  const stats = await prisma.review.aggregate({
    where: { toUserId: user.id },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const completedJobs = await prisma.job.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ brandId: { in: brandIds } }, { activeCreatorId: { in: creatorIds } }],
    },
    select: {
      id: true,
      title: true,
      brandId: true,
      activeCreatorId: true,
      brand: { select: { brandProfile: { select: { companyName: true } }, name: true, email: true } },
      activeCreator: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const reviewedJobIds = new Set(
    (
      await prisma.review.findMany({
        where: { fromUserId: user.id },
        select: { jobId: true },
      })
    ).map((review) => review.jobId),
  );

  const pendingReviews = completedJobs.filter((job) => !reviewedJobIds.has(job.id));

  const averageRating =
    stats._count._all > 0 ? stats._avg.rating?.toFixed(1) ?? "—" : "—";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div>
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard">
          ← В кабинет
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Отзывы</h1>
        <p className="text-sm text-muted-foreground">
          Оставляйте обратную связь после завершенных заказов.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Оставить отзыв</CardTitle>
          <CardDescription>Доступны только завершенные заказы без вашего отзыва.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingReviews.length === 0 ? (
            <Alert variant="info" title="Нет заказов для отзыва">
              Все завершенные заказы уже оценены.
            </Alert>
          ) : (
            pendingReviews.map((job) => {
              const targetLabel =
                brandIds.includes(job.brandId)
                  ? job.activeCreator?.name || job.activeCreator?.email || "Креатор"
                  : job.brand.brandProfile?.companyName || job.brand.name || job.brand.email || "Бренд";

              return (
                <Card key={job.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <CardDescription>Получатель: {targetLabel}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReviewForm jobId={job.id} toLabel={targetLabel} />
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Отзывы обо мне</CardTitle>
            <CardDescription>Последние 20 отзывов.</CardDescription>
          </div>
          <Badge variant="soft">Средняя оценка: {averageRating}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewsReceived.length === 0 ? (
            <Alert variant="info" title="Пока нет отзывов">
              Отзывы появятся после завершения заказов.
            </Alert>
          ) : (
            reviewsReceived.map((review) => (
              <div key={review.id} className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <Badge variant="soft">{review.rating}/5</Badge>
                  <span>{review.job.title}</span>
                  <span className="text-xs">
                    {formatDistanceToNow(review.createdAt, { addSuffix: true, locale: ru })}
                  </span>
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
