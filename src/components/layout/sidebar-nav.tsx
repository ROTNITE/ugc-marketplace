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

const ROLE_ACCENT: Record<RolePreset, string> = {
  CREATOR: "bg-accent-creator text-accent-creator-foreground",
  BRAND: "bg-accent-brand text-accent-brand-foreground",
  ADMIN: "bg-accent-admin text-accent-admin-foreground",
};

export function SidebarNav({ role, nav, collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border-soft px-3 py-3">
          <span className={cn("h-2.5 w-2.5 rounded-full", ROLE_ACCENT[role])} />
          <div className={cn("text-ui-sm font-ui-semibold", collapsed ? "sr-only" : null)}>
            Marketplace
          </div>
          <div className={cn("text-ui-xs text-muted-foreground", collapsed ? "sr-only" : null)}>
            {role === "ADMIN" ? "Админ" : role === "BRAND" ? "Бренд" : "Креатор"}
          </div>
        </div>

      <nav className={cn("flex-1 space-y-4 px-2 py-4", collapsed ? "text-center" : null)}>
        {nav.map((group) => (
          <div key={group.title} className="space-y-2">
            <div className={cn("text-ui-xs font-ui-medium uppercase tracking-wide text-muted-foreground", collapsed ? "sr-only" : null)}>
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
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
                      "flex items-center gap-2 rounded-md px-3 py-2 text-ui-sm transition-colors duration-normal ease-standard",
                      isActive
                        ? "bg-muted/70 text-foreground border border-border-soft"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      collapsed ? "justify-center" : null,
                    )}
                  >
                    {item.icon ? (
                      <span className={cn("text-muted-foreground", isActive ? "text-foreground" : null)}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className={cn("font-ui-medium", collapsed ? "text-ui-sm" : null)}>{label}</span>
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
