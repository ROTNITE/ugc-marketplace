"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RolePreset } from "@/components/layout/sidebar-nav";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { Glow, Noise } from "@/components/ui/decorations";
import { NotificationBell } from "@/components/notification-bell";
import { SearchCombobox } from "@/components/search-combobox";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

type TopbarProps = {
  title: string;
  subtitle?: string;
  role: RolePreset;
  collapsed: boolean;
  onMenuClick: () => void;
  onCollapseToggle: () => void;
  actions?: React.ReactNode;
};

/**
 * Topbar appears above dashboard content and holds navigation toggles,
 * contextual titles, search, notification centre and account menu. It uses
 * an overlay surface variant with decorative glow and noise backgrounds to
 * stand out against the page content.
 */
export function Topbar({
  title,
  subtitle,
  role,
  collapsed,
  onMenuClick,
  onCollapseToggle,
  actions,
}: TopbarProps) {
  const roleLabel = role === "ADMIN" ? "Админ" : role === "BRAND" ? "Бренд" : "Креатор";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative z-30">
      {/* Surface wrapper with glow/noise backgrounds */}
      <Surface variant="overlay" className="rounded-none border-b border-white/15">
        <Glow className="opacity-60" />
        <Noise />
        <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6 relative">
          {/* Left controls */}
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <IconButton
              onClick={onMenuClick}
              aria-label="Открыть меню"
              variant="ghost"
              className="lg:hidden p-2"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </IconButton>
            {/* Sidebar collapse toggle on desktop */}
            <IconButton
              onClick={onCollapseToggle}
              aria-label={collapsed ? "Развернуть сайдбар" : "Свернуть сайдбар"}
              variant="ghost"
              className="hidden lg:inline-flex p-2"
            >
              {collapsed ? <ChevronRight className="h-5 w-5" aria-hidden /> : <ChevronLeft className="h-5 w-5" aria-hidden />}
            </IconButton>
            {/* Titles */}
            <div>
              <div className="text-base font-semibold text-white/90 leading-tight">{title}</div>
              {subtitle ? <div className="text-xs text-white/60">{subtitle}</div> : null}
            </div>
          </div>

          {/* Search bar on larger screens */}
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <div className="relative w-full max-w-md">
              <SearchCombobox placeholder="Поиск по креаторам, брифам…" />
            </div>
          </div>

          {/* Actions, notifications and profile menu */}
          <div className="flex items-center gap-3">
            {/* Notification bell shows unread count and opens notifications */}
            <NotificationBell className="hidden lg:inline-flex" />
            {/* Custom actions if provided, else show placeholder */}
            <div className={cn("hidden lg:flex items-center gap-2", actions ? null : "opacity-60")}>{actions ?? <span className="text-sm text-white/60">Действия</span>}</div>
            {/* Profile dropdown */}
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} align="end">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-medium text-white/80 backdrop-blur-md lg:flex hover:bg-white/15"
                  aria-label="Открыть меню профиля"
                >
                  {role === "ADMIN" ? "AD" : role === "BRAND" ? "BR" : "CR"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px] rounded-xl border border-white/20 bg-white/5 backdrop-blur-lg p-2">
                <DropdownMenuLabel className="text-white/70">Аккаунт · {roleLabel}</DropdownMenuLabel>
                <DropdownMenuItem className="text-white/80">Настройки (заглушка)</DropdownMenuItem>
                <DropdownMenuItem className="text-white/80">Уведомления (заглушка)</DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-t border-white/15" />
                <DropdownMenuItem asChild>
                  <LogoutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Surface>
    </div>
  );
}