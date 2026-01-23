"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-border-soft bg-background px-3 py-2 text-ui-sm text-foreground transition-colors duration-normal ease-standard " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
          "focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 ring-offset-background",
        className,
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";
