"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { SidebarNav, type NavGroup, type RolePreset } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  role: RolePreset;
  nav: NavGroup[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ role, nav, title, subtitle, actions, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-border-soft bg-background lg:flex",
            collapsed ? "w-20" : "w-72",
          )}
        >
          <Surface variant="raised" className="m-4 flex h-[calc(100%-2rem)] flex-col">
            <SidebarNav role={role} nav={nav} collapsed={collapsed} />
          </Surface>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={title}
            subtitle={subtitle}
            role={role}
            collapsed={collapsed}
            onMenuClick={() => setMobileOpen(true)}
            onCollapseToggle={() => setCollapsed((prev) => !prev)}
            actions={actions}
          />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent side="right" className="p-0">
          <div className="h-full p-4">
            <SidebarNav role={role} nav={nav} onNavigate={() => setMobileOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
