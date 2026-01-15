import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "danger";

const variants: Record<Variant, string> = {
  info: "border-border bg-muted/50 text-foreground",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export function Alert({
  title,
  children,
  variant = "info",
  className,
}: {
  title?: string;
  children?: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", variants[variant], className)}>
      {title ? <div className="font-semibold mb-1">{title}</div> : null}
      {children}
    </div>
  );
}
