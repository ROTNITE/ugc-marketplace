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
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Безопасно для MVP</h2>
        <p className="text-sm text-muted-foreground">
          Минимум фичей, но все ключевые точки сделки уже защищены.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {SAFETY.map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border/60 bg-card p-5 text-sm text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-2 text-base font-semibold text-foreground">{item.title}</div>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
