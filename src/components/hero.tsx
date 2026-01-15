"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <p className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            СНГ · UGC · короткие видео · быстрые пачки контента
          </p>

          <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight">
            Маркетплейс UGC-креаторов для{" "}
            <span className="text-primary">TikTok / Reels / Shorts</span>
          </h1>

          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Бренды размещают задания — креаторы откликаются и снимают живые вертикальные видео.
            Скелет сервиса уже работает: лента заказов, фильтры, отклики и личный кабинет.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link href="/jobs">
              <Button size="lg">Найти заказы</Button>
            </Link>
            <Link href="/dashboard/jobs/new">
              <Button size="lg" variant="outline">
                Разместить заказ
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="font-medium text-foreground">Без аудитории</div>
              <div className="mt-1">UGC — это контент, а не интеграции.</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="font-medium text-foreground">Мультиплатформа</div>
              <div className="mt-1">Файлы можно использовать где угодно.</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="font-medium text-foreground">Пакеты прав</div>
              <div className="mt-1">Шаблоны для органики/рекламы/whitelisting.</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
