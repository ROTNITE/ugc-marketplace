import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-muted/10" />
      <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-muted/40 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 py-16 relative">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            UGC marketplace v1
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            UGC-маркетплейс для креаторов и брендов (СНГ)
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Находи заказы на короткие видео и получай оплату. Бренды — запускайте пачки UGC
            быстрее.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/jobs">
              <Button size="lg" className="transition hover:-translate-y-0.5 hover:shadow-md">
                Смотреть заказы
              </Button>
            </Link>
            <Link href="/dashboard/jobs/new">
              <Button
                size="lg"
                variant="outline"
                className="transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Создать заказ
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Для брендов",
              text: "Бриф, отклики, чат и сделка — все в одном потоке.",
            },
            {
              title: "Для креаторов",
              text: "Короткие видео без сложных требований, можно без лица.",
            },
            {
              title: "Локальный фокус",
              text: "СНГ-платформы, рублёвые бюджеты и быстрый цикл сделок.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border/60 bg-card/80 p-4 text-sm text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 font-medium text-foreground">{item.title}</div>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
