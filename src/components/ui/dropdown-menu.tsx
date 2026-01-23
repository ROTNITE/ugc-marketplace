"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Align = "start" | "end";

type DropdownContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align: Align;
  triggerRef: React.RefObject<HTMLElement>;
  contentId: string;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

type DropdownMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: Align;
  children: React.ReactNode;
};

export function DropdownMenu({
  open,
  onOpenChange,
  align = "end",
  children,
}: DropdownMenuProps) {
  const triggerRef = React.useRef<HTMLElement>(null);
  const contentId = React.useId();

  return (
    <DropdownContext.Provider value={{ open, onOpenChange, align, triggerRef, contentId }}>
      {children}
    </DropdownContext.Provider>
  );
}

type DropdownMenuTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

export function DropdownMenuTrigger({ asChild = false, children }: DropdownMenuTriggerProps) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) {
    throw new Error("DropdownMenuTrigger must be used within <DropdownMenu>.");
  }

  const triggerProps = {
    ref: ctx.triggerRef as React.Ref<HTMLButtonElement>,
    onClick: () => ctx.onOpenChange(!ctx.open),
    "aria-haspopup": "menu" as const,
    "aria-expanded": ctx.open,
    "aria-controls": ctx.contentId,
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as React.HTMLAttributes<HTMLElement> & {
      onClick?: React.MouseEventHandler<HTMLElement>;
    };
    const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
      childProps.onClick?.(event);
      triggerProps.onClick?.();
    };
    const mergedRef = mergeRefs<HTMLElement>(
      (children as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref,
      ctx.triggerRef,
    );
    return React.cloneElement(children, {
      ...childProps,
      ...triggerProps,
      ref: mergedRef,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  );
}

type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: Align;
};

export function DropdownMenuContent({
  className,
  align,
  children,
  ...props
}: DropdownMenuContentProps) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) {
    throw new Error("DropdownMenuContent must be used within <DropdownMenu>.");
  }

  const { open, onOpenChange, triggerRef } = ctx;
  const [position, setPosition] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const top = rect.bottom + 8;
      const width = 220;
      const left = (align ?? ctx.align) === "end" ? rect.right - width : rect.left;
      setPosition({
        top: Math.max(8, top),
        left: Math.max(8, left),
      });
    }
  }, [open, align, ctx.align, triggerRef]);

  React.useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const items = Array.from(
          contentRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? [],
        );
        if (!items.length) return;
        const currentIndex = items.findIndex((item) => item === document.activeElement);
        const nextIndex =
          event.key === "ArrowDown"
            ? currentIndex === -1 || currentIndex === items.length - 1
              ? 0
              : currentIndex + 1
            : currentIndex <= 0
              ? items.length - 1
              : currentIndex - 1;
        items[nextIndex]?.focus();
      }
    }

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onOpenChange(false);
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handlePointer);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handlePointer);
    };
  }, [open, onOpenChange, triggerRef]);

  React.useEffect(() => {
    if (open) return;
    const focusTimer = window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [open, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      id={ctx.contentId}
      className={cn(
        "fixed z-50 min-w-[220px] rounded-lg border border-border-soft bg-overlay text-overlay-foreground shadow-elevated",
        "p-2 text-ui-sm",
        className,
      )}
      style={{ top: position.top, left: position.left }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-2 py-1 text-ui-xs font-ui-medium uppercase tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children?: React.ReactNode;
};

export function DropdownMenuItem({ className, asChild = false, children, ...props }: DropdownMenuItemProps) {
  const classes = cn(
    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-ui-sm text-foreground",
    "transition-colors duration-normal ease-standard hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
    className,
  );

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as React.HTMLAttributes<HTMLElement> & {
      onClick?: React.MouseEventHandler<HTMLElement>;
    };
    const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
      props.onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
      childProps.onClick?.(event);
    };
    return React.cloneElement(children, {
      ...childProps,
      role: childProps.role ?? "menuitem",
      tabIndex: childProps.tabIndex ?? -1,
      className: cn(classes, childProps.className),
      onClick: handleClick,
    });
  }

  return (
    <button type="button" role="menuitem" className={classes} {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-2 h-px bg-border-soft", className)} {...props} />;
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}
