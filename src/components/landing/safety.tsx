import { MotionSection } from "@/components/landing/motion";

const SAFETY = [
  {
    title: "Статусы и прозрачность",
    text: "Все заказы и отклики имеют понятные статусы и историю действий.",
  },
  {
    title: "Модерация брифов",
    text: "MVP предполагает базовую проверку формулировок и требований.",
  },
  {
    title: "Коммуникация в чате",
    text: "Чат фиксирует договоренности и ускоряет согласование деталей.",
  },
];

export function LandingSafety() {
  return (
    <MotionSection className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Безопасно для MVP</h2>
        <p className="text-sm text-muted-foreground">
          Минимум фичей, но все ключевые точки сделки уже защищены.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {SAFETY.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border/50 bg-surface/40 p-5 text-sm text-muted-foreground shadow-subtle backdrop-blur transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="mb-2 text-base font-semibold text-foreground">{item.title}</div>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </MotionSection>
  );
}
