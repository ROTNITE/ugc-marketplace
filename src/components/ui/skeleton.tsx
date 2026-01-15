import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} {...props} />;
}

type ListSkeletonProps = {
  rows?: number;
  className?: string;
};

export function ListSkeleton({ rows = 6, className }: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="rounded-lg border border-border/60 bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export function TableSkeleton({ rows = 6, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className={`grid gap-3 ${columns === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={`grid gap-3 ${columns === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

type CardGridSkeletonProps = {
  cards?: number;
  className?: string;
};

export function CardGridSkeleton({ cards = 6, className }: CardGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="rounded-lg border border-border/60 bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-4 h-9 w-28" />
        </div>
      ))}
    </div>
  );
}
