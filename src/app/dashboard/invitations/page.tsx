import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { InvitationActions } from "@/components/invitations/invitation-actions";
import { getCreatorIds } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getInvitationStatusBadge } from "@/lib/status-badges";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { DataList, DataListItem } from "@/components/ui/data-list";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function InvitationsPage({
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

  if (user.role !== "CREATOR") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для креаторов">
          Приглашения доступны только креаторским аккаунтам.
        </Alert>
      </Container>
    );
  }

  const creatorIds = getCreatorIds(user);

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    include: { portfolioItems: { select: { url: true } } },
  });

  const completeness = profile
    ? getCreatorCompleteness({
        displayName: user.name,
        bio: profile.bio,
        platforms: profile.platforms,
        portfolioLinks: profile.portfolioItems.map((item) => item.url).filter(Boolean),
        pricePerVideo: profile.pricePerVideo ?? null,
      })
    : null;

  const limit = parseLimit(searchParams);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(searchParams));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);

  const result = await prisma.invitation.findMany({
    where: {
      creatorId: { in: creatorIds },
      status: "SENT",
      ...(cursorWhere ? { AND: [cursorWhere] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      job: {
        select: { id: true, title: true },
      },
      brand: {
        select: { brandProfile: { select: { companyName: true } }, name: true, email: true },
      },
    },
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (inv) => ({
    id: inv.id,
    createdAt: inv.createdAt.toISOString(),
  }));
  const invitations = paged.items;
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
    <Container size="lg" className="py-10 space-y-6">
      <PageHeader
        title="Приглашения"
        description="Бренды могут приглашать вас напрямую. Примите, чтобы продолжить общение по заказу."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/deals">
            Назад к сделкам
          </Link>
        }
      />

      {completeness?.missing.length ? (
        <Alert variant="warning" title="Профиль не заполнен">
          <div className="space-y-2">
            <p>Заполните профиль, чтобы принимать приглашения.</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {completeness.missing.map((item) => (
                <li key={item.key}>{item.label}</li>
              ))}
            </ul>
            <Link className="text-primary hover:underline text-sm" href="/dashboard/profile">
              Перейти в профиль
            </Link>
          </div>
        </Alert>
      ) : null}

      {invitations.length === 0 ? (
        <EmptyState
          title="Пока нет приглашений"
          description="Когда бренд отправит приглашение, оно появится здесь."
        />
      ) : (
        <>
          <DataList className="space-y-4">
            {invitations.map((inv) => {
              const brandName =
                inv.brand.brandProfile?.companyName || inv.brand.name || inv.brand.email || "Бренд";
              const invitationBadge = getInvitationStatusBadge(inv.status);
              return (
                <DataListItem key={inv.id}>
                  <div className="flex flex-row items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-ui-base font-ui-semibold leading-tight tracking-tight">{inv.job.title}</h3>
                      <p className="text-ui-sm text-muted-foreground leading-relaxed">Бренд: {brandName}</p>
                      <Link className="text-primary text-sm hover:underline" href={`/jobs/${inv.job.id}`}>
                        Открыть заказ
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={invitationBadge.variant} tone={invitationBadge.tone}>
                        {invitationBadge.label}
                      </Badge>
                      <span>{formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true, locale: ru })}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {inv.message ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inv.message}</p>
                    ) : null}
                    <InvitationActions invitationId={inv.id} jobId={inv.job.id} />
                  </div>
                </DataListItem>
              );
            })}
          </DataList>
          {nextCursor ? (
            <div>
              <Link href={`/dashboard/invitations?${nextParams.toString()}`}>
                <Button variant="outline">Показать еще</Button>
              </Link>
            </div>
          ) : null}
        </>
      )}
    </Container>
  );
}



