import { getServerSession } from "next-auth/next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InvitationActions } from "@/components/invitations/invitation-actions";
import { getCreatorIds } from "@/lib/authz";
import { getCreatorCompleteness } from "@/lib/profiles/completeness";

export const dynamic = "force-dynamic";

export default async function InvitationsPage() {
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

  if (user.role !== "CREATOR") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Только для креаторов">
          Приглашения доступны только креаторским аккаунтам.
        </Alert>
      </div>
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

  const invitations = await prisma.invitation.findMany({
    where: { creatorId: { in: creatorIds }, status: "SENT" },
    orderBy: { createdAt: "desc" },
    include: {
      job: {
        select: { id: true, title: true },
      },
      brand: {
        select: { brandProfile: { select: { companyName: true } }, name: true, email: true },
      },
    },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/deals">
          ← К сделкам
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Приглашения</h1>
        <p className="text-sm text-muted-foreground">
          Бренды могут приглашать вас напрямую. Примите, чтобы продолжить общение по заказу.
        </p>
      </div>

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
        <Alert variant="info" title="Пока нет приглашений">
          Когда бренд отправит приглашение, оно появится здесь.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {invitations.map((inv) => {
            const brandName =
              inv.brand.brandProfile?.companyName || inv.brand.name || inv.brand.email || "Бренд";
            return (
              <Card key={inv.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{inv.job.title}</CardTitle>
                    <CardDescription>Бренд: {brandName}</CardDescription>
                    <Link className="text-primary text-sm hover:underline" href={`/jobs/${inv.job.id}`}>
                      Открыть заказ
                    </Link>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true, locale: ru })}</div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {inv.message ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inv.message}</p>
                  ) : null}
                  <InvitationActions invitationId={inv.id} jobId={inv.job.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}



