"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "outline";
type Size = "sm" | "md";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  "aria-label": string;
}

const base =
  "inline-flex items-center justify-center rounded-md transition-colors duration-normal ease-standard " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

const variants: Record<Variant, string> = {
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
  outline: "border border-border-soft text-muted-foreground hover:text-foreground hover:bg-muted/50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => {
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
    );
  },
);

IconButton.displayName = "IconButton";
