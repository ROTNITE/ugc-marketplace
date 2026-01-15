import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CURRENCY_LABELS } from "@/lib/constants";
import { AdminPayoutActions } from "@/components/payouts/admin-payout-actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "CANCELED"] as const;

function truncate(value: string | null | undefined, max = 60) {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default async function AdminPayoutsPage({
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

  const statusParam = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
  const status = STATUS_OPTIONS.includes(statusParam as typeof STATUS_OPTIONS[number])
    ? (statusParam as typeof STATUS_OPTIONS[number])
    : "PENDING";

  const payouts = await prisma.payoutRequest.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
          Назад в админку
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Выплаты</h1>
        <p className="text-sm text-muted-foreground">Обработка заявок на вывод средств.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((item) => (
          <Link
            key={item}
            className={`rounded-md border px-3 py-2 text-sm ${
              item === status ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
            href={`/admin/payouts?status=${item}`}
          >
            {item}
          </Link>
        ))}
      </div>

      {payouts.length === 0 ? (
        <Alert variant="info" title="Пока пусто">
          Нет заявок с выбранным статусом.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {payouts.map((payout) => {
            const creatorName = payout.user.name || payout.user.email || "Креатор";
            const currencyLabel = CURRENCY_LABELS[payout.currency] ?? payout.currency;
            return (
              <Card key={payout.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{creatorName}</CardTitle>
                      <CardDescription>
                        {Math.round(payout.amountCents / 100)} {currencyLabel} ·{" "}
                        {format(payout.createdAt, "dd.MM.yyyy HH:mm", { locale: ru })}
                      </CardDescription>
                    </div>
                    <Badge variant="soft">{payout.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="text-muted-foreground">Метод: {truncate(payout.payoutMethod, 80)}</div>
                  {payout.reason ? (
                    <div className="text-rose-600 text-xs">Причина: {payout.reason}</div>
                  ) : null}
                  {payout.status === "PENDING" ? (
                    <AdminPayoutActions payoutId={payout.id} />
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
