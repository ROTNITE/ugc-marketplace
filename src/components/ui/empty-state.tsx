import { cn } from "@/lib/utils";

type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, action, icon, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border-soft bg-surface/70 px-6 py-8 text-center shadow-subtle",
        className,
      )}
      {...props}
    >
      {icon ? <div className="mx-auto mb-3 flex w-fit items-center justify-center text-muted-foreground">{icon}</div> : null}
      <h3 className="text-ui-base font-ui-semibold leading-tight">{title}</h3>
      {description ? <p className="mt-2 text-ui-sm text-muted-foreground leading-relaxed">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}
