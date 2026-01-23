"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
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

type TopbarProps = {
  title: string;
  subtitle?: string;
  role: RolePreset;
  collapsed: boolean;
  onMenuClick: () => void;
  onCollapseToggle: () => void;
  actions?: React.ReactNode;
};

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
    <Surface variant="overlay" className="sticky top-0 z-30 rounded-none border-b border-border-soft">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <IconButton
            onClick={onMenuClick}
            aria-label="Открыть меню"
            variant="outline"
            className="lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </IconButton>
          <IconButton
            onClick={onCollapseToggle}
            aria-label={collapsed ? "Развернуть сайдбар" : "Свернуть сайдбар"}
            variant="outline"
            className="hidden lg:inline-flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
          </IconButton>
          <div>
            <div className="text-ui-base font-ui-semibold">{title}</div>
            {subtitle ? <div className="text-ui-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-border-soft bg-surface px-3 py-2 text-ui-sm text-muted-foreground">
            <span>Поиск</span>
            <span className="text-muted-foreground/60">(заглушка)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn("hidden items-center gap-2 lg:flex", actions ? null : "opacity-60")}>
            {actions ?? <span className="text-ui-sm text-muted-foreground">Быстрые действия</span>}
          </div>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} align="end">
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-muted text-ui-xs font-ui-medium text-muted-foreground lg:flex"
                aria-label="Открыть меню профиля"
              >
                {role === "ADMIN" ? "AD" : role === "BRAND" ? "BR" : "CR"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Аккаунт · {roleLabel}</DropdownMenuLabel>
              <DropdownMenuItem>Настройки (заглушка)</DropdownMenuItem>
              <DropdownMenuItem>Уведомления (заглушка)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <LogoutButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Surface>
  );
}
