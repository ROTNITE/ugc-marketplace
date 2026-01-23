import { cn } from "@/lib/utils";

type StatProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  hint?: string;
};

export function Stat({ label, value, hint, className, ...props }: StatProps) {
  return (
    <div className={cn("rounded-lg border border-border-soft bg-card px-4 py-3 shadow-subtle", className)} {...props}>
      <div className="text-ui-xs font-ui-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-ui-2xl font-ui-semibold">{value}</div>
      {hint ? <div className="mt-1 text-ui-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
