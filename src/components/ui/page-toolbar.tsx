import * as React from "react";
import { cn } from "@/lib/utils";

type PageToolbarProps = React.HTMLAttributes<HTMLDivElement>;

export function PageToolbar({ className, ...props }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-6 border-b border-border-soft pb-5",
        className,
      )}
      {...props}
    />
  );
}

export function PageToolbarTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("text-ui-xl font-ui-semibold leading-tight tracking-tight", className)} {...props} />
  );
}

export function PageToolbarDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-ui-sm text-muted-foreground leading-relaxed", className)} {...props} />;
}

export function PageToolbarActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)} {...props} />;
}
