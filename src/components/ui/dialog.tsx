"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  hasTitle: boolean;
  hasDescription: boolean;
  setHasTitle: (value: boolean) => void;
  setHasDescription: (value: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const baseId = React.useId();
  const titleId = `${baseId}-dialog-title`;
  const descriptionId = `${baseId}-dialog-description`;
  const [hasTitle, setHasTitle] = React.useState(false);
  const [hasDescription, setHasDescription] = React.useState(false);

  return (
    <DialogContext.Provider
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
    </DialogContext.Provider>
  );
}

type DialogTriggerProps = {
  asChild?: boolean;
  children: React.ReactNode;
};

export function DialogTrigger({ asChild = false, children }: DialogTriggerProps) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("DialogTrigger must be used within <Dialog>.");
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

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  disableOutsideClick?: boolean;
};

export function DialogContent({
  className,
  children,
  disableOutsideClick = false,
  ...props
}: DialogContentProps) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("DialogContent must be used within <Dialog>.");
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          "relative w-full max-w-lg rounded-lg border border-border-soft bg-overlay text-overlay-foreground shadow-elevated",
          "p-6 motion-reduce:transition-none",
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

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const ctx = React.useContext(DialogContext);
  React.useEffect(() => {
    ctx?.setHasTitle(true);
    return () => ctx?.setHasTitle(false);
  }, [ctx]);

  return <h2 id={ctx?.titleId} className={cn("text-ui-lg font-ui-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = React.useContext(DialogContext);
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

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex flex-wrap justify-end gap-2", className)} {...props} />;
}

export function DialogClose({ asChild = false, children }: DialogTriggerProps) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("DialogClose must be used within <Dialog>.");
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
