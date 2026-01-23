import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";
import { isDbUnavailableError, shouldDegradeDbErrors } from "@/lib/db-errors";
import { log } from "@/lib/logger";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  let unreadCount = 0;
  let unreadByType: Array<{ type: string; _count: { _all: number } }> = [];
  let dbDegraded = false;
  if (user) {
    try {
      [unreadCount, unreadByType] = await Promise.all([
        prisma.notification.count({ where: { userId: user.id, isRead: false } }),
        prisma.notification.groupBy({
          by: ["type"],
          where: { userId: user.id, isRead: false },
          _count: { _all: true },
        }),
      ]);
    } catch (error) {
      if (shouldDegradeDbErrors() && isDbUnavailableError(error)) {
        log("warn", "db", { message: "site-header unread counts fallback", error: String(error) });
        unreadCount = 0;
        unreadByType = [];
        dbDegraded = true;
      } else {
        throw error;
      }
    }
  }

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
          ? [
              { label: "Админка", href: "/admin" },
              { label: "Уведомления", href: "/admin/notifications" },
            ]
          : [
              { label: "Заказы", href: "/jobs" },
              { label: "Креаторы", href: "/creators" },
            ];

  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const dashboardLabel = user?.role === "ADMIN" ? "В админку" : "В кабинет";
  const notificationsHref = user?.role === "ADMIN" ? "/admin/notifications" : "/dashboard/notifications";

  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
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
          <ThemeToggle className="hidden md:inline-flex" />
          {user ? (
            <>
              <Link
                href={notificationsHref}
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
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="soft">
                  {user.role === "BRAND" ? "Бренд" : user.role === "CREATOR" ? "Креатор" : "Админ"}
                </Badge>
                <Link href={dashboardHref}>
                  <Button size="sm" variant="secondary">
                    {dashboardLabel}
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="secondary">
                  Войти
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Регистрация</Button>
              </Link>
            </div>
          )}

          <details className="relative md:hidden">
            <summary className="list-none cursor-pointer rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Меню
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border/60 bg-background p-2 shadow-sm">
              <nav className="flex flex-col gap-1 text-sm text-muted-foreground">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                    href={item.href}
                  >
                    <span>{item.label}</span>
                    {item.badge ? <Badge variant="soft">{item.badge}</Badge> : null}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      className="rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                      href={notificationsHref}
                    >
                      Уведомления
                    </Link>
                    <Link
                      className="rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                      href={dashboardHref}
                    >
                      {dashboardLabel}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      className="rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                      href="/login"
                    >
                      Войти
                    </Link>
                    <Link
                      className="rounded-md px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                      href="/register"
                    >
                      Регистрация
                    </Link>
                  </>
                )}
              </nav>
              <div className="border-t border-border/60 pt-2">
                <p className="px-3 pb-2 text-xs uppercase tracking-wide text-muted-foreground">Тема</p>
                <ThemeToggle className="w-full" />
              </div>
            </div>
          </details>
        </div>
      </div>
      {process.env.NODE_ENV === "development" && dbDegraded && (
        <div className="mx-auto max-w-6xl px-4 pb-2 text-xs text-muted-foreground">
          Если база недоступна, показываются значения по умолчанию.
        </div>
      )}
    </header>
  );
}
