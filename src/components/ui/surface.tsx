import { cn } from "@/lib/utils";

/**
 * Surface defines a semi-transparent panel used throughout the redesigned
 * application. It implements a glassmorphic look by combining a subtle
 * backdrop blur, translucent backgrounds and soft borders. Four variants
 * correspond to different elevations: base, raised, glass and overlay. The
 * interactive prop enables a glow on hover for clickable elements.
 */
type SurfaceVariant = "base" | "raised" | "glass" | "overlay";

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Selects one of the four elevation variants */
  variant?: SurfaceVariant;
  /** Applies a glow on hover for interactive panels */
  interactive?: boolean;
};

// Map each variant to a set of utility classes. These classes rely on
// Tailwind's arbitrary values and CSS variables defined in globals.css.
const VARIANTS: Record<SurfaceVariant, string> = {
  /**
   * Base surfaces are used for containers and cards. They are slightly
   * translucent and have a gentle blur and shadow.
   */
  base: "bg-white/5 text-white/90 border border-white/10 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
  /**
   * Raised surfaces are higher in elevation and thus slightly more opaque and
   * feature a stronger shadow. Use for modals or highlighted sections.
   */
  raised: "bg-white/7 text-white/90 border border-white/12 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
  /**
   * Glass variant emphasises transparency. Useful for overlaying on busy
   * backgrounds such as hero sections or image cards.
   */
  glass: "bg-white/6 text-white/90 border border-white/10 backdrop-blur-lg shadow-[0_4px_16px_rgba(0,0,0,0.5)]",
  /**
   * Overlay surfaces are used for top bars or drawers. They have higher
   * contrast and stronger blur to separate content from the backdrop.
   */
  overlay: "bg-white/4 text-white/90 border border-white/15 backdrop-blur-lg shadow-[0_4px_20px_rgba(0,0,0,0.6)]",
};

export function Surface({ variant = "base", interactive = false, className, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-300 ease-out",
        VARIANTS[variant],
        interactive ? "hover:shadow-[0_0_10px_rgba(34,211,238,0.4)] hover:border-white/20" : null,
        className,
      )}
      {...props}
    />
  );
}