import { cn } from "@/lib/utils";

type SurfaceVariant = "base" | "raised" | "glass" | "overlay";

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  interactive?: boolean;
};

const VARIANTS: Record<SurfaceVariant, string> = {
  base: "bg-surface text-surface-foreground border border-border-soft shadow-subtle",
  raised: "bg-card text-card-foreground border border-border-soft shadow-raised",
  glass: "bg-glass/60 text-foreground border border-glass-border backdrop-blur-glass shadow-raised",
  overlay: "bg-overlay text-overlay-foreground border border-border-strong shadow-elevated",
};

export function Surface({
  variant = "base",
  interactive = false,
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-lg transition-colors duration-normal ease-standard",
        VARIANTS[variant],
        interactive ? "hover:shadow-glow hover:border-border-strong" : null,
        className,
      )}
      {...props}
    />
  );
}
