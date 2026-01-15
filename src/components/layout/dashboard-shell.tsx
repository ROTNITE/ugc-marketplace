import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

type NavItem = { label: string; href: string };

const CREATOR_NAV: NavItem[] = [
  { label: "Обзор", href: "/dashboard" },
  { label: "Сделки", href: "/dashboard/deals" },
  { label: "Отклики", href: "/dashboard/applications" },
  { label: "Приглашения", href: "/dashboard/invitations" },
  { label: "Сообщения", href: "/dashboard/inbox" },
  { label: "Баланс", href: "/dashboard/balance" },
  { label: "Отзывы", href: "/dashboard/reviews" },
  { label: "Профиль", href: "/dashboard/profile" },
  { label: "Уведомления", href: "/dashboard/notifications" },
];

const BRAND_NAV: NavItem[] = [
  { label: "Обзор", href: "/dashboard" },
  { label: "Заказы", href: "/dashboard/jobs" },
  { label: "Сделки", href: "/dashboard/deals" },
  { label: "Сообщения", href: "/dashboard/inbox" },
  { label: "Отзывы", href: "/dashboard/reviews" },
  { label: "Профиль", href: "/dashboard/profile" },
  { label: "Уведомления", href: "/dashboard/notifications" },
];

export async function DashboardShell({ children }: { children: ReactNode }) {
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
          Раздел кабинета предназначен для брендов и креаторов.{" "}
          <Link className="text-primary hover:underline" href="/admin">
            Перейти в админку
          </Link>
        </Alert>
      </div>
    );
  }

  const navItems = user.role === "BRAND" ? BRAND_NAV : CREATOR_NAV;
  const roleLabel = user.role === "BRAND" ? "Бренд" : "Креатор";

  return (
    <div className="bg-background text-foreground">
      <div className="border-b border-border/60 bg-background/70">
        <Container className="py-3" motion>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="soft">{roleLabel}</Badge>
            <span className="text-xs uppercase tracking-wide">Навигация кабинета</span>
          </div>
          <details className="mt-2 md:hidden">
            <summary className="list-none cursor-pointer rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Меню
            </summary>
            <nav className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  className="rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
          <nav className="mt-2 hidden md:flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="px-3 py-2 hover:text-foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </Container>
      </div>
      {children}
    </div>
  );
}
