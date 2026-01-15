import { cn } from "@/lib/utils";

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-8 text-center",
        className,
      )}
      {...props}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
