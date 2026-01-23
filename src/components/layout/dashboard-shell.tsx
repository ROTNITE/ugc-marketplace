import type { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { AppShell } from "@/components/layout/app-shell";
import type { NavGroup } from "@/components/layout/sidebar-nav";
import {
  Bell,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Star,
  User,
  Wallet,
  Zap,
} from "lucide-react";

const CREATOR_NAV: NavGroup[] = [
  {
    title: "Основное",
      items: [
      { label: "Обзор", href: "/dashboard", shortLabel: "Обз", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Сделки", href: "/dashboard/deals", shortLabel: "Сд", icon: <Briefcase className="h-4 w-4" /> },
      { label: "Отклики", href: "/dashboard/applications", shortLabel: "О", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Приглашения", href: "/dashboard/invitations", shortLabel: "П", icon: <Zap className="h-4 w-4" /> },
      { label: "Алерты", href: "/dashboard/alerts", shortLabel: "А", icon: <Bell className="h-4 w-4" /> },
      ],
    },
    {
      title: "Коммуникации",
      items: [
      { label: "Сообщения", href: "/dashboard/inbox", shortLabel: "Чат", icon: <MessageCircle className="h-4 w-4" /> },
      { label: "Уведомления", href: "/dashboard/notifications", shortLabel: "Ув", icon: <Bell className="h-4 w-4" /> },
      ],
    },
    {
      title: "Финансы и профиль",
      items: [
      { label: "Баланс", href: "/dashboard/balance", shortLabel: "₽", icon: <Wallet className="h-4 w-4" /> },
      { label: "Отзывы", href: "/dashboard/reviews", shortLabel: "★", icon: <Star className="h-4 w-4" /> },
      { label: "Профиль", href: "/dashboard/profile", shortLabel: "Пр", icon: <User className="h-4 w-4" /> },
      ],
    },
  ];

const BRAND_NAV: NavGroup[] = [
  {
    title: "Основное",
      items: [
      { label: "Обзор", href: "/dashboard", shortLabel: "Обз", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Заказы", href: "/dashboard/jobs", shortLabel: "За", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Сделки", href: "/dashboard/deals", shortLabel: "Сд", icon: <Briefcase className="h-4 w-4" /> },
      ],
    },
    {
      title: "Коммуникации",
      items: [
      { label: "Сообщения", href: "/dashboard/inbox", shortLabel: "Чат", icon: <MessageCircle className="h-4 w-4" /> },
      { label: "Уведомления", href: "/dashboard/notifications", shortLabel: "Ув", icon: <Bell className="h-4 w-4" /> },
      ],
    },
    {
      title: "Профиль и отзывы",
      items: [
      { label: "Отзывы", href: "/dashboard/reviews", shortLabel: "★", icon: <Star className="h-4 w-4" /> },
      { label: "Профиль", href: "/dashboard/profile", shortLabel: "Пр", icon: <User className="h-4 w-4" /> },
      ],
    },
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

  const navGroups = user.role === "BRAND" ? BRAND_NAV : CREATOR_NAV;
  const rolePreset = user.role === "BRAND" ? "BRAND" : "CREATOR";
  const title = user.role === "BRAND" ? "Кабинет бренда" : "Кабинет креатора";

  return (
    <AppShell
      role={rolePreset}
      nav={navGroups}
      title={title}
      subtitle="Панель управления"
      actions={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
