import { cn } from "@/lib/utils";

type Variant = "default" | "soft";

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variant === "default"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground border border-border/60",
        className,
      )}
    >
      {children}
    </span>
  );
}
