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
  Building2,
  Cog,
  DollarSign,
  FileText,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

const ADMIN_NAV: NavGroup[] = [
  {
    title: "Основное",
      items: [
      { label: "Админ‑панель", href: "/admin", shortLabel: "A", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Модерация заказов", href: "/admin/jobs?status=PENDING", shortLabel: "За", icon: <FileText className="h-4 w-4" /> },
      { label: "Верификация креаторов", href: "/admin/creators?status=PENDING", shortLabel: "Кр", icon: <ShieldCheck className="h-4 w-4" /> },
      { label: "Споры", href: "/admin/disputes?status=OPEN", shortLabel: "Сп", icon: <Gavel className="h-4 w-4" /> },
      { label: "Выплаты", href: "/admin/payouts?status=PENDING", shortLabel: "₽", icon: <DollarSign className="h-4 w-4" /> },
      { label: "Финансы", href: "/admin/finance", shortLabel: "Ф", icon: <Building2 className="h-4 w-4" /> },
      ],
    },
    {
      title: "Система",
      items: [
      { label: "Уведомления", href: "/admin/notifications", shortLabel: "Ув", icon: <Bell className="h-4 w-4" /> },
      { label: "Настройки", href: "/admin/settings", shortLabel: "Н", icon: <Cog className="h-4 w-4" /> },
      { label: "События", href: "/admin/events?processed=unprocessed", shortLabel: "С", icon: <FileText className="h-4 w-4" /> },
      ],
    },
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
    <AppShell
      role="ADMIN"
      nav={ADMIN_NAV}
      title="Админ‑панель"
      subtitle="Контроль и модерация"
      actions={<LogoutButton />}
    >
      {children}
    </AppShell>
  );
}
