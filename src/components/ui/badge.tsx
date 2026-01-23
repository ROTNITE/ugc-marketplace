import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "soft";
export type BadgeTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

// Tone configuration for glassmorphic badges. Each tone defines two variants:
// default – slightly more opaque with stronger colour; soft – subtler with
// lower opacity. Colours correspond to the design tokens defined in
// globals.css (primary, info, success, warning, danger) or fall back to
// neutral.
const TONE_CLASSES: Record<BadgeTone, Record<BadgeVariant, string>> = {
  neutral: {
    default: "bg-white/10 text-white/80 border border-white/20",
    soft: "bg-white/6 text-white/60 border border-white/20",
  },
  primary: {
    default: "bg-primary/20 text-primary border border-primary/40",
    soft: "bg-primary/10 text-primary border border-primary/30",
  },
  info: {
    default: "bg-info/20 text-info border border-info/40",
    soft: "bg-info/10 text-info border border-info/30",
  },
  success: {
    default: "bg-success/20 text-success border border-success/40",
    soft: "bg-success/10 text-success border border-success/30",
  },
  warning: {
    default: "bg-warning/20 text-warning border border-warning/40",
    soft: "bg-warning/10 text-warning border border-warning/30",
  },
  danger: {
    default: "bg-danger/20 text-danger border border-danger/40",
    soft: "bg-danger/10 text-danger border border-danger/30",
  },
};

/**
 * Badge renders a small pill used for labels, statuses or highlights. It
 * supports two variants: default (bolder) and soft (lighter). The tone
 * controls the colour palette.
 */
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
  const resolvedTone: BadgeTone = tone ?? (variant === "soft" ? "neutral" : "primary");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200",
        TONE_CLASSES[resolvedTone][variant],
        className,
      )}
    >
      {children}
    </span>
  );
}