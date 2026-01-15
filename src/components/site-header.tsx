import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const [unreadCount, unreadByType] = user
    ? await Promise.all([
        prisma.notification.count({ where: { userId: user.id, isRead: false } }),
        prisma.notification.groupBy({
          by: ["type"],
          where: { userId: user.id, isRead: false },
          _count: { _all: true },
        }),
      ])
    : [0, []];

  const unreadMap = new Map(unreadByType.map((item) => [item.type, item._count._all]));
  const inboxUnread = unreadMap.get("MESSAGE_SENT") ?? 0;
  const creatorDealsUnread =
    (unreadMap.get("APPLICATION_ACCEPTED") ?? 0) +
    (unreadMap.get("ESCROW_FUNDED") ?? 0) +
    (unreadMap.get("ESCROW_RELEASED") ?? 0) +
    (unreadMap.get("JOB_COMPLETED") ?? 0);
  const brandDealsUnread =
    (unreadMap.get("APPLICATION_CREATED") ?? 0) + (unreadMap.get("SUBMISSION_SUBMITTED") ?? 0);

  const navLinks =
    user?.role === "CREATOR"
      ? [
          { label: "Заказы", href: "/jobs" },
          { label: "Сообщения", href: "/dashboard/inbox", badge: inboxUnread || undefined },
          { label: "Сделки", href: "/dashboard/deals", badge: creatorDealsUnread || undefined },
          { label: "Баланс", href: "/dashboard/balance" },
          { label: "Отзывы", href: "/dashboard/reviews" },
          { label: "Профиль", href: "/dashboard/profile" },
        ]
      : user?.role === "BRAND"
        ? [
            { label: "Сделки", href: "/dashboard/deals", badge: brandDealsUnread || undefined },
            { label: "Креаторы", href: "/creators" },
            { label: "Сообщения", href: "/dashboard/inbox", badge: inboxUnread || undefined },
            { label: "Отзывы", href: "/dashboard/reviews" },
            { label: "Профиль", href: "/dashboard/profile" },
          ]
        : user?.role === "ADMIN"
          ? [{ label: "Admin", href: "/admin" }]
          : [
              { label: "Заказы", href: "/jobs" },
              { label: "Креаторы", href: "/creators" },
            ];

  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const dashboardLabel = user?.role === "ADMIN" ? "В админку" : "В кабинет";

  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse-soft" />
              UGC Marketplace
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            {navLinks.map((item) => (
              <Link key={item.href} className="px-3 py-2 hover:text-foreground flex items-center gap-2" href={item.href}>
                {item.label}
                {item.badge ? <Badge variant="soft">{item.badge}</Badge> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
                aria-label="Уведомления"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-primary px-1.5 text-[10px] leading-5 text-primary-foreground">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
              <Badge variant="soft">
                {user.role === "BRAND" ? "Brand" : user.role === "CREATOR" ? "Creator" : "Admin"}
              </Badge>
              <Link href={dashboardHref}>
                <Button size="sm" variant="secondary">
                  {dashboardLabel}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="secondary">
                  Войти
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Регистрация</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
