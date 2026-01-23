"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = React.useId();

  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border-soft bg-muted/50 p-1",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("TabsTrigger must be used within <Tabs>.");
  }

  const isActive = ctx.value === value;
  const id = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!ctx) return;
    const list = event.currentTarget.parentElement;
    if (!list) return;
    const triggers = Array.from(list.querySelectorAll<HTMLButtonElement>("[role='tab']"));
    const currentIndex = triggers.indexOf(event.currentTarget);
    if (currentIndex < 0) return;

    const lastIndex = triggers.length - 1;
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    if (event.key === "ArrowLeft") nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      const next = triggers[nextIndex];
      next?.focus();
      const nextValue = next?.dataset.value;
      if (nextValue) {
        ctx.onValueChange(nextValue);
      }
    }
  }

  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={panelId}
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      data-value={value}
      onClick={() => ctx.onValueChange(value)}
      onKeyDown={onKeyDown}
      className={cn(
        "rounded-md px-3 py-1.5 text-ui-sm font-ui-medium transition-colors duration-normal ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        isActive
          ? "bg-card text-foreground border border-border-soft shadow-subtle"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("TabsContent must be used within <Tabs>.");
  }

  const isActive = ctx.value === value;
  const id = `${ctx.baseId}-panel-${value}`;
  const tabId = `${ctx.baseId}-tab-${value}`;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={tabId}
      className={cn("rounded-lg border border-border-soft bg-card p-4 shadow-subtle", className)}
      {...props}
    />
  );
}
