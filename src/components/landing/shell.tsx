import type { ReactNode } from "react";

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-shell relative isolate overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="absolute -top-48 right-[-10%] h-[520px] w-[520px] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute -bottom-64 left-[-15%] h-[560px] w-[560px] rounded-full bg-info/20 blur-[160px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/10 to-background/90" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
