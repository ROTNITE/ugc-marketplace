import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  currentIndex,
  className,
}: {
  steps: string[];
  currentIndex: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap gap-2", className)}>
      {steps.map((s, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
              isActive && "border-primary text-foreground",
              isDone && "border-border text-muted-foreground bg-muted/40",
              !isActive && !isDone && "border-border text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isDone && "bg-muted text-muted-foreground",
                !isActive && !isDone && "bg-background text-muted-foreground border border-border",
              )}
            >
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
