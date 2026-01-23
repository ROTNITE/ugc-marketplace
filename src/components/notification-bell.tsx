"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface NotificationBellProps {
  /**
   * Destination when clicking the bell. Defaults to `/dashboard/notifications`.
   */
  href?: string;
  /**
   * Additional classes passed to the container element.
   */
  className?: string;
  /**
   * Initial unread count provided by the server. The component will
   * immediately display this value before starting to poll for updates.
   */
  initialCount?: number;
}

/**
 * A client component that displays a bell icon with an unread count badge.
 *
 * The component polls the `/api/notifications/unread` endpoint every few
 * seconds to keep the unread count up to date. This avoids requiring a full
 * page reload for notifications. The poll interval is kept modest to
 * minimise load on the backend while remaining responsive.
 */
export function NotificationBell({ href = "/dashboard/notifications", className, initialCount = 0 }: NotificationBellProps) {
  const [count, setCount] = useState<number>(initialCount);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let mounted = true;
    async function fetchCount() {
      try {
        const response = await fetch("/api/notifications/unread");
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) {
          setCount(data.count ?? 0);
        }
      } catch {
        // ignore network errors silently
      } finally {
        // schedule next fetch after 15 seconds
        timeout = setTimeout(fetchCount, 15000);
      }
    }
    fetchCount();
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition-colors duration-200 hover:bg-white/15 hover:text-white",
        className,
      )}
      aria-label="Уведомления"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
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
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-primary/80 px-1.5 text-[10px] leading-5 text-primary-foreground">
          {count}
        </span>
      ) : null}
    </Link>
  );
}