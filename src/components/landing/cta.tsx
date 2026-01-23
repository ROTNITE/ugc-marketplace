import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/landing/motion";

export function LandingCta() {
  return (
    <MotionSection className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-border/50 bg-surface/40 p-6 shadow-elevated backdrop-blur transition duration-normal ease-standard hover:shadow-glow sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Готовы запустить первые UGC-пачки?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Начните с ленты заказов или создайте свой бриф за пару минут.
              </p>
            </div>
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
        </div>
      </div>
    </MotionSection>
  );
}
