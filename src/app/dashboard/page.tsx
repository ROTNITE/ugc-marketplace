import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) {
    // middleware should already redirect, but just in case
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </Container>
    );
  }

  const isBrand = user.role === "BRAND";
  const isCreator = user.role === "CREATOR";
  const isAdmin = user.role === "ADMIN";

  if (isAdmin) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Админ-кабинет">
          Этот раздел предназначен для брендов и креаторов.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-10 space-y-6">
      <PageHeader
        title="Кабинет"
        description={`Привет, ${user.name ?? user.email}. Это базовый кабинет - будем расширять.`}
        actions={
          <>
            <Badge variant="soft">{isBrand ? "Бренд" : isCreator ? "Креатор" : "Админ"}</Badge>
            <LogoutButton />
          </>
        }
      />

      {isBrand ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Разместить заказ" description="Создайте бриф и опубликуйте">
            <Link className="text-primary hover:underline" href="/dashboard/jobs/new">
              Создать заказ
            </Link>
          </SectionCard>

          <SectionCard title="Сделки" description="Заказы, отклики и приёмка">
            <Link className="text-primary hover:underline" href="/dashboard/deals">
              Открыть сделки
            </Link>
          </SectionCard>

          <SectionCard title="Сообщения" description="Диалоги по заказам и чат с креаторами">
            <Link className="text-primary hover:underline" href="/dashboard/inbox">
              Открыть сообщения
            </Link>
          </SectionCard>

          <SectionCard title="Профиль бренда" description="Компания, сайт, описание">
            <Link className="text-primary hover:underline" href="/dashboard/profile">
              Открыть профиль
            </Link>
          </SectionCard>

          <SectionCard title="Отзывы" description="Оценки и обратная связь">
            <Link className="text-primary hover:underline" href="/dashboard/reviews">
              Перейти к отзывам
            </Link>
          </SectionCard>
        </div>
      ) : null}

      {isCreator ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SectionCard title="Найти заказы" description="Лента заданий с фильтрами">
            <Link className="text-primary hover:underline" href="/jobs">
              Открыть ленту
            </Link>
          </SectionCard>

          <SectionCard title="Сделки" description="Приглашения, отклики, работа">
            <Link className="text-primary hover:underline" href="/dashboard/deals">
              Открыть сделки
            </Link>
          </SectionCard>

          <SectionCard title="Сообщения" description="Диалоги с брендами">
            <Link className="text-primary hover:underline" href="/dashboard/inbox">
              Открыть сообщения
            </Link>
          </SectionCard>

          <SectionCard title="Профиль" description="Портфолио, прайс и настройки">
            <Link className="text-primary hover:underline" href="/dashboard/profile">
              Открыть профиль
            </Link>
          </SectionCard>

          <SectionCard title="Баланс" description="История операций и заявки на вывод">
            <Link className="text-primary hover:underline" href="/dashboard/balance">
              Открыть баланс
            </Link>
          </SectionCard>

          <SectionCard title="Отзывы" description="Оценки и обратная связь">
            <Link className="text-primary hover:underline" href="/dashboard/reviews">
              Перейти к отзывам
            </Link>
          </SectionCard>
        </div>
      ) : null}

      <Alert variant="info" title="Следующие шаги">
        Здесь будут появляться новые разделы и улучшения кабинета.
      </Alert>
    </Container>
  );
}
