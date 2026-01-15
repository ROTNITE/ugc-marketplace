import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { VerificationStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreatorVerificationActions } from "@/components/admin/creator-verification-actions";
import { getVerificationStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { buildUpdatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const FILTERS = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;

export default async function AdminCreatorsPage({
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

  if (user.role !== "ADMIN") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только администраторам.
        </Alert>
      </Container>
    );
  }

  const rawFilter = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const filter: VerificationStatus = FILTERS.includes(rawFilter as VerificationStatus)
    ? (rawFilter as VerificationStatus)
    : "PENDING";

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ updatedAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildUpdatedAtCursorWhere(cursor);

  const where = { verificationStatus: filter } as Prisma.CreatorProfileWhereInput;
  if (cursorWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), cursorWhere];
  }

  const result = await prisma.creatorProfile.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      portfolioItems: { select: { url: true }, take: 2 },
      verificationReviewedByUser: { select: { name: true, email: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (creator) => ({
    id: creator.id,
    updatedAt: creator.updatedAt.toISOString(),
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

  return (
    <Container className="py-10 space-y-6">
      <PageHeader
        title="Верификация креаторов"
        description="Проверка кодов и профилей."
        eyebrow={
          <Link className="hover:text-foreground" href="/admin">
            Назад к админке
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Статус верификации</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const statusBadge = getVerificationStatusBadge(item);
            return (
              <Link
                key={item}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  item === filter ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
                href={`/admin/creators?status=${item}`}
              >
                {statusBadge.label}
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {creators.length === 0 ? (
        <EmptyState title="Нет профилей" description="Пока нет профилей в этом статусе." />
      ) : (
        <>
          <div className="grid gap-4">
            {creators.map((creator) => {
              const name = creator.user?.name || creator.user?.email || "Креатор";
              const platforms = creator.platforms?.length ? creator.platforms.join(", ") : "-";
              const links = creator.portfolioItems?.map((item) => item.url).filter(Boolean).slice(0, 2) ?? [];
              const statusBadge = getVerificationStatusBadge(creator.verificationStatus);

              return (
                <Card key={creator.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>{name}</CardTitle>
                        <CardDescription>{creator.user?.email}</CardDescription>
                      </div>
                      <Badge variant={statusBadge.variant} tone={statusBadge.tone}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {creator.verificationReviewedAt ? (
                      <div className="text-muted-foreground text-xs">
                        Рассмотрено: {new Date(creator.verificationReviewedAt).toLocaleString()}
                        {creator.verificationReviewedByUser
                          ? ` · ${creator.verificationReviewedByUser.name ?? creator.verificationReviewedByUser.email}`
                          : ""}
                      </div>
                    ) : null}
                    <div>
                      <span className="text-muted-foreground">Платформы:</span> {platforms}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Код:</span>{" "}
                      <span className="text-foreground">{creator.verificationCode ?? "-"}</span>
                    </div>
                    {links.length ? (
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Портфолио:</span>
                        {links.map((link) => (
                          <div key={link}>
                            <a className="text-primary hover:underline break-all" href={link} target="_blank" rel="noreferrer">
                              {link}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {creator.verificationReason ? (
                      <Alert variant="warning" title="Причина отказа">
                        {creator.verificationReason}
                      </Alert>
                    ) : null}

                    {creator.verificationStatus === "PENDING" ? (
                      <CreatorVerificationActions creatorProfileId={creator.id} />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {nextCursor ? (
            <div>
              <Link href={`/admin/creators?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}
