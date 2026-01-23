import * as React from "react";
import { cn } from "@/lib/utils";

type DataListProps = React.HTMLAttributes<HTMLDivElement>;

export function DataList({ className, ...props }: DataListProps) {
  return <div role="list" className={cn("space-y-3", className)} {...props} />;
}

type DataListItemProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};

export function DataListItem({
  asChild = false,
  interactive = false,
  disabled = false,
  className,
  children,
  tabIndex,
  ...props
}: DataListItemProps) {
  const baseClasses = cn(
    "rounded-lg border border-border-soft bg-card px-4 py-3 text-foreground shadow-subtle transition-shadow",
    interactive
      ? "cursor-pointer transition-colors duration-normal ease-standard hover:bg-muted/50 hover:border-border-strong hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-raised ring-offset-background"
      : null,
    disabled ? "pointer-events-none opacity-50" : null,
    className,
  );

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as React.HTMLAttributes<HTMLElement> & {
      onClick?: React.MouseEventHandler<HTMLElement>;
    };
    const hasClick = Boolean(props.onClick || childProps.onClick);
    const handleClick: React.MouseEventHandler<HTMLElement> | undefined = hasClick
      ? (event) => {
          props.onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
          childProps.onClick?.(event);
        }
      : undefined;
    return React.cloneElement(children, {
      ...childProps,
      ...props,
      role: childProps.role ?? "listitem",
      tabIndex: childProps.tabIndex ?? (interactive ? 0 : undefined),
      "aria-disabled": disabled || childProps["aria-disabled"] ? true : undefined,
      className: cn(baseClasses, childProps.className),
      onClick: handleClick ?? childProps.onClick,
    });
  }

  return (
    <div
      role="listitem"
      className={baseClasses}
      tabIndex={tabIndex ?? (interactive ? 0 : undefined)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DataListHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-1 text-ui-xs font-ui-medium uppercase tracking-wide text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DataListEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border-soft bg-muted/20 px-4 py-6 text-center text-ui-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
