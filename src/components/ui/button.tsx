"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Button variants and sizes mirror the original skeleton but have been enhanced
// with colourful gradients and subtle glow effects. The primary variant now uses
// a gradient from the primary to the info colour to emphasise the neon
// aesthetic. Hover states gently increase brightness rather than simply
// darkening the colour. Secondary and outline variants receive soft surfaces
// appropriate for a glassmorphic interface.

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-ui-medium transition-all duration-normal ease-standard " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

// Updated variant definitions with gradients and glows
const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-primary to-info text-primary-foreground shadow-glow " +
    "hover:from-primary/90 hover:to-info/90 hover:shadow-glow",
  secondary:
    "bg-surface/80 text-foreground shadow-subtle hover:bg-surface/60", // soft surface with subtle hover
  outline:
    "border border-border-soft bg-transparent text-foreground hover:bg-surface/50 hover:shadow-subtle",
  ghost: "bg-transparent text-foreground hover:bg-surface/40",
  destructive: "bg-danger text-danger-foreground shadow-subtle hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-ui-sm",
  md: "h-10 px-4 text-ui-sm",
  lg: "h-11 px-5 text-ui-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
    );
  },
);

Button.displayName = "Button";