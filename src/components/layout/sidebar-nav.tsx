"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type RolePreset = "CREATOR" | "BRAND" | "ADMIN";

export type NavItem = {
  label: string;
  href: string;
  shortLabel?: string;
  icon?: React.ReactNode;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

type SidebarNavProps = {
  role: RolePreset;
  nav: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
};

// Accent colours per role. These correspond to CSS variables defined in
// globals.css (e.g. --accent-creator). They are used for the small dot in the
// sidebar header to indicate the current role.
const ROLE_ACCENT: Record<RolePreset, string> = {
  CREATOR: "bg-accent-creator",
  BRAND: "bg-accent-brand",
  ADMIN: "bg-accent-admin",
};

/**
 * SidebarNav renders a vertical navigation for dashboard pages. It supports
 * collapsing to a narrow strip which displays only icons or short labels.
 * Nav items highlight based on the current pathname. Glassmorphic styling
 * with subtle hover and active states helps integrate the component with
 * the overall dark neon aesthetic.
 */
export function SidebarNav({ role, nav, collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Header with role indicator */}
      <div className="flex items-center gap-3 border-b border-white/15 px-4 py-4">
        <span className={cn("h-2.5 w-2.5 rounded-full", ROLE_ACCENT[role])} />
        <div className={cn("font-semibold text-sm text-white/85", collapsed ? "sr-only" : null)}>
          Marketplace
        </div>
        <div className={cn("text-xs text-white/50", collapsed ? "sr-only" : null)}>
          {role === "ADMIN" ? "Админ" : role === "BRAND" ? "Бренд" : "Креатор"}
        </div>
      </div>

      <nav className={cn("flex-1 space-y-6 px-3 py-6", collapsed ? "text-center" : null)}>
        {nav.map((group) => (
          <div key={group.title} className="space-y-3">
            <div
              className={cn(
                "uppercase tracking-wide text-xs font-medium text-white/50",
                collapsed ? "sr-only" : null,
              )}
            >
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                // Determine active state based on current route
                const baseHref = item.href.split("?")[0];
                const isActive = pathname === baseHref || pathname.startsWith(`${baseHref}/`);
                const label = collapsed ? item.shortLabel ?? item.label.slice(0, 1) : item.label;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", // base
                      isActive
                        ? "bg-white/15 border border-white/20 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white/90",
                      collapsed ? "justify-center" : null,
                    )}
                  >
                    {item.icon ? (
                      <span className={cn("text-white/60", isActive ? "text-white" : null)}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className={cn(collapsed ? "text-sm" : null)}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}