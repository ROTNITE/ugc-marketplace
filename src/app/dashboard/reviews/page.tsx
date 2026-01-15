import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewForm } from "@/components/reviews/review-form";
import { getBrandIds, getCreatorIds } from "@/lib/authz";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { buildCreatedAtCursorWhere, buildUpdatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
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

  if (user.role === "ADMIN") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Раздел отзывов доступен только брендам и креаторам.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </Container>
    );
  }

  const brandIds = getBrandIds(user);
  const creatorIds = getCreatorIds(user);

  const receivedLimit = parseLimit(searchParams, { key: "receivedLimit", defaultLimit: 20 });
  const receivedCursor = decodeCursor<{ createdAt: string; id: string }>(
    parseCursor(searchParams, "receivedCursor"),
  );
  const receivedCursorWhere = buildCreatedAtCursorWhere(receivedCursor);

  const reviewsResult = await prisma.review.findMany({
    where: {
      toUserId: user.id,
      ...(receivedCursorWhere ? { AND: [receivedCursorWhere] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: receivedLimit + 1,
    include: { job: { select: { title: true } } },
  });

  const receivedPaged = sliceWithNextCursor(reviewsResult, receivedLimit, (review) => ({
    id: review.id,
    createdAt: review.createdAt.toISOString(),
  }));
  const reviewsReceived = receivedPaged.items;
  const nextReceivedCursor = receivedPaged.nextCursor;

  const stats = await prisma.review.aggregate({
    where: { toUserId: user.id },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const pendingLimit = parseLimit(searchParams, { key: "pendingLimit", defaultLimit: 20 });
  const pendingCursor = decodeCursor<{ updatedAt: string; id: string }>(
    parseCursor(searchParams, "pendingCursor"),
  );
  const pendingCursorWhere = buildUpdatedAtCursorWhere(pendingCursor);

  const completedResult = await prisma.job.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ brandId: { in: brandIds } }, { activeCreatorId: { in: creatorIds } }],
      ...(pendingCursorWhere ? { AND: [pendingCursorWhere] } : {}),
    },
    select: {
      id: true,
      title: true,
      brandId: true,
      activeCreatorId: true,
      updatedAt: true,
      brand: { select: { brandProfile: { select: { companyName: true } }, name: true, email: true } },
      activeCreator: { select: { name: true, email: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: pendingLimit + 1,
  });

  const pendingPaged = sliceWithNextCursor(completedResult, pendingLimit, (job) => ({
    id: job.id,
    updatedAt: job.updatedAt.toISOString(),
  }));
  const completedJobs = pendingPaged.items;
  const nextPendingCursor = pendingPaged.nextCursor;

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
    stats._count._all > 0 ? stats._avg.rating?.toFixed(1) ?? "-" : "-";

  const baseParams = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => baseParams.append(key, item));
      return;
    }
    if (value !== undefined) {
      baseParams.set(key, value);
    }
  });
  const nextReceivedParams = new URLSearchParams(baseParams);
  if (nextReceivedCursor) {
    nextReceivedParams.set("receivedCursor", nextReceivedCursor);
    nextReceivedParams.set("receivedLimit", String(receivedLimit));
  }
  const nextPendingParams = new URLSearchParams(baseParams);
  if (nextPendingCursor) {
    nextPendingParams.set("pendingCursor", nextPendingCursor);
    nextPendingParams.set("pendingLimit", String(pendingLimit));
  }

  return (
    <Container className="py-10 space-y-8">
      <PageHeader
        title="Отзывы"
        description="Оставляйте обратную связь после завершенных заказов."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard">
            В кабинет
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Оставить отзыв</CardTitle>
          <CardDescription>Доступны только завершенные заказы без вашего отзыва.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingReviews.length === 0 ? (
            <EmptyState title="Нет заказов для отзыва" description="Все завершенные заказы уже оценены." />
          ) : (
            <>
              {pendingReviews.map((job) => {
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
              })}
              {nextPendingCursor ? (
                <div>
                  <Link href={`/dashboard/reviews?${nextPendingParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Отзывы обо мне</CardTitle>
            <CardDescription>Последние отзывы.</CardDescription>
          </div>
          <Badge variant="soft">Средняя оценка: {averageRating}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewsReceived.length === 0 ? (
            <EmptyState title="Пока нет отзывов" description="Отзывы появятся после завершения заказов." />
          ) : (
            <>
              {reviewsReceived.map((review) => (
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
              ))}
              {nextReceivedCursor ? (
                <div>
                  <Link href={`/dashboard/reviews?${nextReceivedParams.toString()}`}>
                    <Button variant="outline">Показать еще</Button>
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
