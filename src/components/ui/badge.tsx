import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "soft";
export type BadgeTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, Record<BadgeVariant, string>> = {
  neutral: {
    default: "bg-muted text-foreground",
    soft: "bg-muted text-muted-foreground border border-border/60",
  },
  primary: {
    default: "bg-primary text-primary-foreground",
    soft: "bg-primary/10 text-primary border border-primary/30",
  },
  info: {
    default: "bg-info text-info-foreground",
    soft: "bg-info/10 text-info border border-info/30",
  },
  success: {
    default: "bg-success text-success-foreground",
    soft: "bg-success/10 text-success border border-success/30",
  },
  warning: {
    default: "bg-warning text-warning-foreground",
    soft: "bg-warning/10 text-warning border border-warning/30",
  },
  danger: {
    default: "bg-danger text-danger-foreground",
    soft: "bg-danger/10 text-danger border border-danger/30",
  },
};

export function Badge({
  children,
  className,
  variant = "default",
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
  tone?: BadgeTone;
}) {
  const resolvedTone = tone ?? (variant === "soft" ? "neutral" : "primary");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-ui-xs font-ui-medium leading-none",
        TONE_CLASSES[resolvedTone][variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
