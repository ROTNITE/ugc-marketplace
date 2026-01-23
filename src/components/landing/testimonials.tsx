import { Badge } from "@/components/ui/badge";
import { MotionSection } from "@/components/landing/motion";

const TESTIMONIALS = [
  {
    quote:
      "Контент выглядит нативно и не ощущается рекламой. Запускаем новые креативы за неделю.",
    author: "Growth Lead · NovaSkin",
    tag: "Paid Social",
  },
  {
    quote:
      "Сделки прозрачные: видно статусы, эскроу и сроки. Команда получила предсказуемый процесс.",
    author: "Brand Manager · PulseWear",
    tag: "UGC",
  },
  {
    quote:
      "Лента креаторов помогает быстро найти формат под бренд и запустить тесты без лишнего стресса.",
    author: "Performance Lead · GlowLab",
    tag: "Performance",
  },
];

export function LandingTestimonials() {
  return (
    <MotionSection className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Отзывы брендов</h2>
        <p className="text-sm text-muted-foreground">
          Реальные сценарии: быстрые запуски, понятная экономика, прогнозируемые сроки.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <div
            key={item.author}
            className="rounded-2xl border border-border/50 bg-surface/40 p-5 text-sm text-muted-foreground shadow-subtle backdrop-blur transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span>★★★★★</span>
              <Badge variant="soft">{item.tag}</Badge>
            </div>
            <p className="text-sm text-foreground">“{item.quote}”</p>
            <p className="mt-4 text-xs text-muted-foreground">{item.author}</p>
          </div>
        ))}
      </div>
    </MotionSection>
  );
}
