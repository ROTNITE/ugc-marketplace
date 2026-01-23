"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DrawerContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  hasTitle: boolean;
  hasDescription: boolean;
  setHasTitle: (value: boolean) => void;
  setHasDescription: (value: boolean) => void;
};

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Drawer({ open, onOpenChange, children }: DrawerProps) {
  const baseId = React.useId();
  const titleId = `${baseId}-drawer-title`;
  const descriptionId = `${baseId}-drawer-description`;
  const [hasTitle, setHasTitle] = React.useState(false);
  const [hasDescription, setHasDescription] = React.useState(false);

  return (
    <DrawerContext.Provider
      value={{
        open,
        onOpenChange,
        titleId,
        descriptionId,
        hasTitle,
        hasDescription,
        setHasTitle,
        setHasDescription,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

type DrawerTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

export function DrawerTrigger({ asChild = false, children }: DrawerTriggerProps) {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) {
    throw new Error("DrawerTrigger must be used within <Drawer>.");
  }

  const triggerProps = {
    onClick: () => ctx.onOpenChange(true),
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...triggerProps,
      ...children.props,
    });
  }

  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  );
}

type DrawerContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: "bottom" | "right";
  disableOutsideClick?: boolean;
};

export function DrawerContent({
  side = "bottom",
  disableOutsideClick = false,
  className,
  children,
  ...props
}: DrawerContentProps) {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) {
    throw new Error("DrawerContent must be used within <Drawer>.");
  }

  const { open, onOpenChange } = ctx;
  const lastActiveRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
      if (lastActiveRef.current) {
        lastActiveRef.current.focus();
      }
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const panelClasses =
    side === "right"
      ? "right-0 top-0 h-full w-[min(420px,90vw)]"
      : "left-0 bottom-0 w-full h-[min(70vh,560px)]";

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => {
          if (!disableOutsideClick) onOpenChange(false);
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ctx.hasTitle ? ctx.titleId : undefined}
        aria-describedby={ctx.hasDescription ? ctx.descriptionId : undefined}
        className={cn(
          "absolute rounded-t-lg border border-border-soft bg-overlay text-overlay-foreground shadow-elevated",
          "motion-reduce:transition-none",
          panelClasses,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1 border-b border-border-soft p-4", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const ctx = React.useContext(DrawerContext);
  React.useEffect(() => {
    ctx?.setHasTitle(true);
    return () => ctx?.setHasTitle(false);
  }, [ctx]);

  return <h2 id={ctx?.titleId} className={cn("text-ui-base font-ui-semibold", className)} {...props} />;
}

export function DrawerDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = React.useContext(DrawerContext);
  React.useEffect(() => {
    ctx?.setHasDescription(true);
    return () => ctx?.setHasDescription(false);
  }, [ctx]);

  return (
    <p
      id={ctx?.descriptionId}
      className={cn("text-ui-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-border-soft p-4", className)} {...props} />;
}

export function DrawerClose({ asChild = false, children }: DrawerTriggerProps) {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) {
    throw new Error("DrawerClose must be used within <Drawer>.");
  }

  const closeProps = {
    onClick: () => ctx.onOpenChange(false),
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...closeProps,
      ...children.props,
    });
  }

  return (
    <button type="button" {...closeProps}>
      {children}
    </button>
  );
}
