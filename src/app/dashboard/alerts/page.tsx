import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertRowActions } from "@/components/alerts/alert-row-actions";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
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
          Алерты доступны только креаторам.
        </Alert>
      </div>
    );
  }

  if (!user.creatorProfileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Профиль не заполнен">
          Заполните профиль, чтобы сохранять алерты.
        </Alert>
      </div>
    );
  }

  const alerts = await prisma.savedJobAlert.findMany({
    where: { creatorProfileId: user.creatorProfileId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/deals">
          ← К сделкам
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Алерты на заказы</h1>
        <p className="text-sm text-muted-foreground">
          Здесь вы управляете сохранёнными фильтрами и уведомлениями.
        </p>
      </div>

      {alerts.length === 0 ? (
        <Alert variant="info" title="Пока нет алертов">
          Создайте алерт в ленте заказов.
        </Alert>
      ) : (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{alert.name}</CardTitle>
                    <CardDescription>
                      {alert.isActive ? "Активен" : "Выключен"}
                    </CardDescription>
                  </div>
                  <Badge variant="soft">{alert.isActive ? "ACTIVE" : "OFF"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2 text-muted-foreground">
                  {alert.platform ? <span>Платформа: {alert.platform}</span> : <span>Платформа: любая</span>}
                  {alert.niche ? <span>Ниша: {alert.niche}</span> : <span>Ниша: любая</span>}
                  {alert.lang ? <span>Язык: {alert.lang}</span> : <span>Язык: любой</span>}
                  {alert.minBudgetCents !== null ? (
                    <span>Бюджет от: {alert.minBudgetCents / 100}</span>
                  ) : (
                    <span>Бюджет от: любой</span>
                  )}
                  {alert.maxBudgetCents !== null ? (
                    <span>Бюджет до: {alert.maxBudgetCents / 100}</span>
                  ) : (
                    <span>Бюджет до: любой</span>
                  )}
                </div>
                <AlertRowActions alertId={alert.id} isActive={alert.isActive} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
