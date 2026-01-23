"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "outline";
type Size = "sm" | "md";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant: ghost (no border) or outline (with border) */
  variant?: Variant;
  /** Size of the square button */
  size?: Size;
  /** Accessible label describing the button */
  "aria-label": string;
}

// Base classes for all icon buttons. We ensure consistent sizing,
// centering and transitions along with focus styles.
const base =
  "inline-flex items-center justify-center rounded-full transition-colors duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

// Variant specific styles. Ghost uses transparent background while outline
// introduces a subtle border. Hover states brighten the text and surface.
const variants: Record<Variant, string> = {
  ghost: "text-white/70 hover:text-white/90 hover:bg-white/10",
  outline: "border border-white/20 text-white/70 hover:text-white/90 hover:bg-white/10",
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