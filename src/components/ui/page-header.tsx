import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="space-y-2">
        {eyebrow ? <div className="text-ui-sm text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-ui-2xl md:text-3xl font-ui-semibold tracking-tight leading-tight">{title}</h1>
        {description ? <p className="text-ui-sm text-muted-foreground leading-relaxed">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
