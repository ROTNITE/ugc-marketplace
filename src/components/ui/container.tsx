import { cn } from "@/lib/utils";

type ContainerSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ContainerSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
};

type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: ContainerSize;
  padded?: boolean;
  motion?: boolean;
};

export function Container({
  size = "xl",
  padded = true,
  motion = false,
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        SIZE_CLASSES[size],
        padded ? "px-4" : null,
        motion ? "animate-fade-in" : null,
        className,
      )}
      {...props}
    />
  );
}
