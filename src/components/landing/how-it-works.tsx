import { MotionSection } from "@/components/landing/motion";

export function LandingHowItWorks() {
  return (
    <MotionSection className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Как это работает</h2>
        <p className="text-sm text-muted-foreground">
          Два сценария — для креаторов и для брендов. Быстрый старт без лишней бюрократии.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-surface/40 p-6 shadow-subtle backdrop-blur transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow">
          <h3 className="text-lg font-semibold">Креатор</h3>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-card/40 text-xs text-foreground">
                1
              </span>
              <span>Находит заказ по фильтрам и описанию брифа.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-card/40 text-xs text-foreground">
                2
              </span>
              <span>Отправляет отклик с ценой и сообщением.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-card/40 text-xs text-foreground">
                3
              </span>
              <span>Получает подтверждение и работает через чат.</span>
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border/50 bg-surface/40 p-6 shadow-subtle backdrop-blur transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow">
          <h3 className="text-lg font-semibold">Бренд</h3>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-card/40 text-xs text-foreground">
                1
              </span>
              <span>Создает заказ с понятным брифом и бюджетом.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-card/40 text-xs text-foreground">
                2
              </span>
              <span>Сравнивает отклики и принимает подходящих.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-card/40 text-xs text-foreground">
                3
              </span>
              <span>Ведет коммуникацию и фиксирует статус сделки.</span>
            </li>
          </ol>
        </div>
      </div>
    </MotionSection>
  );
}
