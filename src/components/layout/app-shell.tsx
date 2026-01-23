"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { SidebarNav, type NavGroup, type RolePreset } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { Glow, Noise } from "@/components/ui/decorations";

type AppShellProps = {
  role: RolePreset;
  nav: NavGroup[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * AppShell composes the overall dashboard layout. It includes a collapsible
 * sidebar for navigation, a topbar for context and actions, and a main area
 * for page content. All surfaces employ a glassmorphic aesthetic and a
 * layered glow/noise background. On mobile, the sidebar becomes a drawer.
 */
export function AppShell({ role, nav, title, subtitle, actions, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Global decorative backgrounds */}
      <div className="absolute inset-0 -z-10">
        {/* Dark gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B10] via-black to-black" />
        {/* Central glow */}
        <div
          className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(var(--primary-rgb),0.28), rgba(var(--info-rgb),0.14), rgba(0,0,0,0))" }}
        />
        {/* Side glow */}
        <div
          className="absolute top-52 right-[-180px] h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(var(--success-rgb),0.20), rgba(var(--info-rgb),0.12), rgba(0,0,0,0))" }}
        />
        {/* Noise overlay */}
        <Noise />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 lg:flex",
            collapsed ? "w-20" : "w-72",
          )}
        >
          <Surface variant="glass" className="m-4 flex h-[calc(100%-2rem)] flex-col p-0">
            <SidebarNav role={role} nav={nav} collapsed={collapsed} />
          </Surface>
        </aside>

        {/* Main area */}
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
            <div className="mx-auto w-full max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile drawer for navigation */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent side="left" className="p-0 max-w-xs">
          <Surface variant="glass" className="h-full p-4">
            <SidebarNav role={role} nav={nav} onNavigate={() => setMobileOpen(false)} />
          </Surface>
        </DrawerContent>
      </Drawer>
    </div>
  );
}