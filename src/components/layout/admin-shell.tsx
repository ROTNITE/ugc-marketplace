import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Container } from "@/components/ui/container";

type NavItem = { label: string; href: string };

const ADMIN_NAV: NavItem[] = [
  { label: "Админка", href: "/admin" },
  { label: "Модерация заказов", href: "/admin/jobs?status=PENDING" },
  { label: "Верификация креаторов", href: "/admin/creators?status=PENDING" },
  { label: "Споры", href: "/admin/disputes?status=OPEN" },
  { label: "Выплаты", href: "/admin/payouts?status=PENDING" },
  { label: "Финансы", href: "/admin/finance" },
  { label: "Настройки", href: "/admin/settings" },
  { label: "События", href: "/admin/events?processed=unprocessed" },
];

export async function AdminShell({ children }: { children: ReactNode }) {
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
          Эта страница доступна только администраторам.{" "}
          <Link className="text-primary hover:underline" href="/dashboard">
            Перейти в кабинет
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60">
        <Container className="py-3" motion>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} className="hover:text-foreground" href={item.href}>
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
