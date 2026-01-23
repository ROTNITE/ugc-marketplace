// Decorative background components used across the redesigned UI.
// These components encapsulate the radial gradient glows and noise overlay
// used throughout the glassmorphic theme. Feel free to reuse them in layouts
// such as AppShell, SidebarNav, Topbar or feature cards. They render nothing
// of their own besides a visually appealing background layer.

import { cn } from "@/lib/utils";

/**
 * Glow renders a radial gradient that softly fades toward the edges. It uses
 * CSS custom properties to ensure the gradient colours remain in sync with
 * your Tailwind configuration. The component accepts an optional className
 * to allow additional positioning or opacity adjustments.
 */
export function Glow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 opacity-80",
        "bg-[radial-gradient(60%_50%_at_50%_20%,rgba(var(--primary-rgb),0.28)_0%,rgba(var(--info-rgb),0.18)_30%,rgba(var(--success-rgb),0.10)_55%,rgba(0,0,0,0)_75%)]",
        className,
      )}
    />
  );
}

/**
 * Noise adds a subtle fractal noise texture overlay. When layered above
 * gradients or blurred surfaces it helps break up banding artifacts and
 * gives surfaces a tactile feel. The blending mode and opacity are tuned
 * for dark backgrounds but can be overridden via className.
 */
export function Noise({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-soft-light",
        "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22120%22%20height%3D%22120%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.7%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22/%3E%3C/filter%3E%3Crect%20width%3D%22120%22%20height%3D%22120%22%20filter%3D%22url(%23n)%22%20opacity%3D%220.55%22/%3E%3C/svg%3E')]",
        className,
      )}
    />
  );
}