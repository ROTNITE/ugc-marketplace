import { cn } from "@/lib/utils";

type Variant = "info" | "success" | "warning" | "danger";

const variants: Record<Variant, string> = {
  info: "border-info/50 bg-info/10 text-info",
  success: "border-success/50 bg-success/10 text-success",
  warning: "border-warning/50 bg-warning/10 text-warning",
  danger: "border-danger/50 bg-danger/10 text-danger",
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
    <div className={cn("rounded-lg border px-4 py-3 text-sm leading-relaxed", variants[variant], className)}>
      {title ? <div className="text-sm font-semibold mb-1">{title}</div> : null}
      {children}
    </div>
  );
}
