import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) {
    // middleware should already redirect, but just in case
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </div>
    );
  }

  const isBrand = user.role === "BRAND";
  const isCreator = user.role === "CREATOR";
  const isAdmin = user.role === "ADMIN";

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Админ-кабинет">
          Этот раздел предназначен для брендов и креаторов.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Кабинет</h1>
          <p className="text-sm text-muted-foreground">
            Привет, {user.name ?? user.email}. Это базовый кабинет - будем расширять.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="soft">{isBrand ? "Brand" : isCreator ? "Creator" : "Admin"}</Badge>
          <LogoutButton />
        </div>
      </div>

      {isBrand ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Разместить заказ</CardTitle>
              <CardDescription>Создайте бриф и опубликуйте</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/jobs/new">
                Создать заказ
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сделки</CardTitle>
              <CardDescription>Заказы, отклики и приёмка</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/deals">
                Открыть сделки
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сообщения</CardTitle>
              <CardDescription>Диалоги по заказам и чат с креаторами</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/inbox">
                Открыть inbox
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Профиль бренда</CardTitle>
              <CardDescription>Компания, сайт, описание</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/profile">
                Открыть профиль
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Отзывы</CardTitle>
              <CardDescription>Оценки и обратная связь</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/reviews">
                Перейти к отзывам
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isCreator ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Найти заказы</CardTitle>
              <CardDescription>Лента заданий с фильтрами</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/jobs">
                Открыть ленту
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сделки</CardTitle>
              <CardDescription>Приглашения, отклики, работа</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/deals">
                Открыть сделки
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Сообщения</CardTitle>
              <CardDescription>Диалоги с брендами</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/inbox">
                Открыть inbox
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Профиль</CardTitle>
              <CardDescription>Портфолио, прайс и настройки</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/profile">
                Открыть профиль
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Баланс</CardTitle>
              <CardDescription>История операций и заявки на вывод</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/balance">
                Открыть баланс
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Отзывы</CardTitle>
              <CardDescription>Оценки и обратная связь</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className="text-primary hover:underline" href="/dashboard/reviews">
                Перейти к отзывам
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Alert variant="info" title="Следующие шаги">
        Здесь будут появляться новые разделы и улучшения кабинета.
      </Alert>
    </div>
  );
}
