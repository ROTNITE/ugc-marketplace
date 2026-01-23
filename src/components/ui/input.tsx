"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Input component with glassmorphism styling.
 *
 * This component extends the default input by applying a translucent background,
 * subtle border and backdrop blur. The result blends nicely into both light and
 * dark themes and supports the neon/glass aesthetic requested. It still uses
 * the existing Tailwind variables for sizing and focus rings.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-border/60 bg-surface/60 backdrop-blur glass px-3 py-2 text-ui-sm text-foreground transition-all duration-normal ease-standard " +
          "placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
          "focus-visible:ring-offset-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";