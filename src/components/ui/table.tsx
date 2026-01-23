import { cn } from "@/lib/utils";

type TableProps = React.HTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;
type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border-soft bg-card shadow-subtle">
      <table className={cn("w-full text-left text-ui-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: TableSectionProps) {
  return (
    <thead
      className={cn("bg-muted/40 text-muted-foreground text-ui-xs uppercase tracking-wide", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: TableSectionProps) {
  return <tbody className={cn("divide-y divide-border-soft", className)} {...props} />;
}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors duration-normal ease-standard hover:bg-muted/30",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn("px-3 py-3 font-ui-medium text-muted-foreground text-ui-xs", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn("px-3 py-3 text-foreground", className)} {...props} />;
}

export function TableCaption({ className, ...props }: TableCaptionProps) {
  return <caption className={cn("px-3 py-2 text-ui-xs text-muted-foreground", className)} {...props} />;
}

type DataTableProps = React.HTMLAttributes<HTMLDivElement> & {
  dense?: boolean;
  zebra?: boolean;
};

export function DataTable({ dense = false, zebra = false, className, ...props }: DataTableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-border-soft bg-card shadow-subtle",
        dense ? "text-ui-xs" : "text-ui-sm",
        zebra ? "[&_tbody_tr:nth-child(even)]:bg-muted/20" : null,
        className,
      )}
      {...props}
    />
  );
}
