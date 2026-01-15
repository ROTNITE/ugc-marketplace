import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { VerificationStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatorVerificationActions } from "@/components/admin/creator-verification-actions";
import { getVerificationStatusBadge } from "@/lib/status-badges";

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

  const rawFilter = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const filter: VerificationStatus = FILTERS.includes(rawFilter as VerificationStatus)
    ? (rawFilter as VerificationStatus)
    : "PENDING";

  const creators = await prisma.creatorProfile.findMany({
    where: { verificationStatus: filter },
    include: {
      user: { select: { name: true, email: true } },
      portfolioItems: { select: { url: true }, take: 2 },
      verificationReviewedByUser: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
          Назад к админке
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Верификация креаторов</h1>
        <p className="text-sm text-muted-foreground">Проверка кодов и профилей.</p>
      </div>

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
        <Alert variant="info" title="Нет профилей">
          Пока нет профилей в этом статусе.
        </Alert>
      ) : (
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
                    <span className="text-foreground">{creator.verificationCode ?? "—"}</span>
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
      )}
    </div>
  );
}
