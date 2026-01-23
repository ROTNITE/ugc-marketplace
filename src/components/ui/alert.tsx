import { cn } from "@/lib/utils";

/**
 * Alert displays contextual feedback messages. Variants map to token colours
 * and remain subtle thanks to translucent backgrounds and blurred glass
 * surfaces. Titles render in a semibold style above the message body.
 */
type Variant = "info" | "success" | "warning" | "danger";

const variants: Record<Variant, string> = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
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
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm backdrop-blur-lg shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
        variants[variant],
        className,
      )}
    >
      {title ? <div className="mb-1 font-semibold">{title}</div> : null}
      {children}
    </div>
  );
}