import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MotionDiv, MotionSection } from "@/components/landing/motion";

export function LandingHero() {
  const pills = ["UGC-маркетплейс v1", "Для брендов", "Для креаторов", "СНГ"];
  const highlights = [
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
  ];

  return (
    <MotionSection className="relative overflow-hidden border-b border-border/40">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 text-xs">
              {pills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-border/50 bg-surface/40 px-3 py-1 text-muted-foreground shadow-subtle backdrop-blur"
                >
                  {pill}
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              UGC-маркетплейс для креаторов и брендов (СНГ)
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Находи заказы на короткие видео и получай оплату. Бренды — запускайте пачки UGC
              быстрее.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input
                  placeholder="Поиск креаторов, ниш, форматов"
                  className="h-12 rounded-full border border-border/50 bg-surface/40 px-5 text-sm text-foreground placeholder:text-muted-foreground transition duration-normal ease-standard focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/jobs">
                  <Button size="lg" className="transition hover:-translate-y-0.5 hover:shadow-glow">
                    Смотреть заказы
                  </Button>
                </Link>
                <Link href="/dashboard/jobs/new">
                  <Button
                    size="lg"
                    variant="outline"
                    className="transition hover:-translate-y-0.5 hover:shadow-subtle"
                  >
                    Создать заказ
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map((item, index) => (
                <MotionDiv
                  key={item.title}
                  delay={0.05 * index}
                  className="rounded-2xl border border-border/50 bg-surface/40 p-4 text-sm text-muted-foreground shadow-subtle backdrop-blur transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="mb-2 text-base font-semibold text-foreground">{item.title}</div>
                  <p>{item.text}</p>
                </MotionDiv>
              ))}
            </div>
          </div>

          <div className="relative">
            <MotionDiv
              delay={0.15}
              className="rounded-[28px] border border-border/50 bg-card/40 p-6 shadow-elevated backdrop-blur-glass"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="soft">Избранное</Badge>
                  <Badge variant="soft">Тренды</Badge>
                </div>
                <span>Превью каталога</span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 shadow-subtle transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Креатор A</p>
                      <p className="text-xs text-muted-foreground">Бьюти · 48–72 часа</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">от 4 900 ₽</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/40 px-2 py-1">UGC-обзор</span>
                    <span className="rounded-full border border-border/40 px-2 py-1">Сценарий</span>
                    <span className="rounded-full border border-border/40 px-2 py-1">Вертикал</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" className="w-full">
                      Портфолио
                    </Button>
                    <Button size="sm" className="w-full">
                      Пригласить
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-surface/40 p-4 shadow-subtle transition duration-normal ease-standard hover:-translate-y-0.5 hover:shadow-glow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Креатор B</p>
                      <p className="text-xs text-muted-foreground">Фитнес · 24–48 часов</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">от 3 500 ₽</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/40 px-2 py-1">Голос за кадром</span>
                    <span className="rounded-full border border-border/40 px-2 py-1">До/после</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" className="w-full">
                      Портфолио
                    </Button>
                    <Button size="sm" className="w-full">
                      Пригласить
                    </Button>
                  </div>
                </div>
              </div>
            </MotionDiv>
            <div className="pointer-events-none absolute -bottom-6 -right-6 hidden rounded-full border border-border/50 bg-surface/40 px-4 py-2 text-xs text-muted-foreground shadow-subtle backdrop-blur lg:inline-flex">
              Только верифицированные креаторы
            </div>
          </div>
        </div>
      </div>
    </MotionSection>
  );
}
