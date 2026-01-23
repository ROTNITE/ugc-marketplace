import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";
import { isDbUnavailableError, shouldDegradeDbErrors } from "@/lib/db-errors";
import { log } from "@/lib/logger";
import { NotificationBell } from "@/components/notification-bell";

/**
 * Server component rendering the top navigation bar. It computes unread
 * notification counts on the server for nav badges, while delegating
 * the bell badge to the client via `<NotificationBell>` for real‑time
 * updates. The design utilises glassmorphic surfaces and neon accents
 * defined in `globals.css`.
 */
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
    <header className="relative border-b border-white/15 bg-white/5 backdrop-blur-lg">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse-soft" />
              UGC Marketplace
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm text-white/70">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                className="px-3 py-2 flex items-center gap-2 hover:text-white transition-colors"
                href={item.href}
              >
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
              {/* Real‑time notification bell */}
              <NotificationBell href={notificationsHref} initialCount={unreadCount} />
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

          {/*
            Mobile drop‑down menu. In the glassmorphic theme it uses translucent
            panels, subtle borders and smooth hover effects. The <details>
            element is used for disclosure; the summary button takes the role
            of the trigger. See `globals.css` for colour variables.
          */}
          <details className="relative md:hidden">
            <summary
              className="list-none cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/70 backdrop-blur-md hover:bg-white/15 hover:text-white"
            >
              Меню
            </summary>
            <div
              className="absolute right-0 z-20 mt-2 w-64 space-y-2 rounded-2xl border border-white/15 bg-white/5 p-3 text-sm text-white/75 backdrop-blur-lg shadow-lg"
            >
              <nav className="flex flex-col gap-1">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                    href={item.href}
                  >
                    <span>{item.label}</span>
                    {item.badge ? <Badge variant="soft">{item.badge}</Badge> : null}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link
                      className="rounded-xl px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                      href={notificationsHref}
                    >
                      Уведомления
                    </Link>
                    <Link
                      className="rounded-xl px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                      href={dashboardHref}
                    >
                      {dashboardLabel}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      className="rounded-xl px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                      href="/login"
                    >
                      Войти
                    </Link>
                    <Link
                      className="rounded-xl px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                      href="/register"
                    >
                      Регистрация
                    </Link>
                  </>
                )}
              </nav>
              <div className="border-t border-white/15 pt-2">
                <p className="px-3 pb-2 text-xs uppercase tracking-wide text-white/50">Тема</p>
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