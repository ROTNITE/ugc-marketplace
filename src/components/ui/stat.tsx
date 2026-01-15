import { cn } from "@/lib/utils";

type StatProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  hint?: string;
};

export function Stat({ label, value, hint, className, ...props }: StatProps) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-card px-4 py-3", className)} {...props}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
