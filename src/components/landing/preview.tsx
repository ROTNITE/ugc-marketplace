import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionDiv, MotionSection } from "@/components/landing/motion";

export function LandingPreview() {
  return (
    <MotionSection className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-border/50 bg-surface/40 px-3 py-1 text-xs text-muted-foreground shadow-subtle backdrop-blur">
            Превью маркетплейса
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Быстро находите креаторов и брифы, которые реально двигают продажи.
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Лента заказов, витрина креаторов и прозрачные статусы — чтобы запускать UGC без
            лишних созвонов.
          </p>
        </div>

        <MotionDiv
          delay={0.1}
          className="rounded-[32px] border border-border/50 bg-card/40 p-6 shadow-elevated backdrop-blur-glass"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Бриф дня</span>
            <Badge variant="soft">Верифицировано</Badge>
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 shadow-subtle transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Skincare бренд</p>
                  <p className="text-xs text-muted-foreground">3 видео · UGC‑стиль</p>
                </div>
                <span className="text-sm font-semibold text-foreground">до 72 часов</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/40 px-2 py-1">Бьюти</span>
                <span className="rounded-full border border-border/40 px-2 py-1">Обзор</span>
                <span className="rounded-full border border-border/40 px-2 py-1">Сценарий</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" className="w-full">
                  Открыть бриф
                </Button>
                <Button size="sm" className="w-full">
                  Откликнуться
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 shadow-subtle transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">UGC‑пакеты</p>
                  <p className="text-xs text-muted-foreground">От 5 роликов</p>
                </div>
                <span className="text-sm font-semibold text-foreground">от 12 000 ₽</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/40 px-2 py-1">Под ключ</span>
                <span className="rounded-full border border-border/40 px-2 py-1">Быстро</span>
                <span className="rounded-full border border-border/40 px-2 py-1">Права включены</span>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
