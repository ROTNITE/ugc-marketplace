import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export function SectionCard({ title, description, actions, className, children, ...props }: SectionCardProps) {
  return (
    <Card className={cn(className)} {...props}>
      {title ? (
        <CardHeader className={actions ? "flex flex-row items-start justify-between gap-3" : undefined}>
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
