import { MotionSection } from "@/components/landing/motion";

const TRUST = ["GlowLab", "PulseWear", "NovaSkin", "ByteCase", "OatMood", "LushDrop"];

export function LandingTrust() {
  return (
    <MotionSection className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Нам доверяют современные бренды</p>
          <p className="text-xs text-muted-foreground">
            Запускают UGC‑кампании быстрее и без лишних согласований.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TRUST.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/40 bg-surface/30 px-4 py-2 text-xs text-muted-foreground shadow-subtle transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}
