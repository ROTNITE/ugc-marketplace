const FEATURES = [
  {
    title: "UGC — формат доверия",
    text: "Короткие ролики выглядят нативно и лучше заходят в рекламе и органике.",
  },
  {
    title: "Микро-креаторы",
    text: "Не нужно миллион подписчиков — важны формат и релевантность.",
  },
  {
    title: "Скорость производства",
    text: "Параллельные отклики и быстрый отбор дают контент за дни, а не недели.",
  },
  {
    title: "Локальность",
    text: "СНГ-платформы, локальные аудитории и удобные валюты.",
  },
];

export function LandingFeatures() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Почему это работает</h2>
        <p className="text-sm text-muted-foreground">
          UGC в 2024+ — это скорость, доверие и масштаб без больших бюджетов.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {FEATURES.map((item) => (
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
