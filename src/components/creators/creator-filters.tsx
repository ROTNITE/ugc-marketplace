"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PLATFORMS, PLATFORM_LABELS, NICHES, NICHE_LABELS, CURRENCIES, CURRENCY_LABELS } from "@/lib/constants";

const LANG_OPTIONS = ["ru", "uk", "en"] as const;

function parseBool(value: string | null) {
  if (!value) return undefined;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

export function CreatorFilters({ canShowUnverified }: { canShowUnverified: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [platform, setPlatform] = useState(sp.get("platform") ?? "");
  const [niche, setNiche] = useState(sp.get("niche") ?? "");
  const [lang, setLang] = useState(sp.get("lang") ?? "");
  const [minPrice, setMinPrice] = useState(sp.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(sp.get("maxPrice") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "recent");
  const [verifiedOnly, setVerifiedOnly] = useState(
    parseBool(sp.get("verifiedOnly")) ?? true,
  );

  const currentQuery = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  function apply() {
    const params = new URLSearchParams(currentQuery);
    const set = (key: string, value: string | null | undefined) => {
      if (value && value.length > 0) params.set(key, value);
      else params.delete(key);
    };

    set("q", q);
    set("platform", platform);
    set("niche", niche);
    set("lang", lang);
    set("minPrice", minPrice);
    set("maxPrice", maxPrice);
    set("sort", sort === "recent" ? "" : sort);
    if (canShowUnverified) {
      if (verifiedOnly) params.delete("verifiedOnly");
      else params.set("verifiedOnly", "false");
    } else {
      params.delete("verifiedOnly");
    }

    params.delete("page");
    router.push(`/creators?${params.toString()}`);
  }

  function reset() {
    setQ("");
    setPlatform("");
    setNiche("");
    setLang("");
    setMinPrice("");
    setMaxPrice("");
    setSort("recent");
    setVerifiedOnly(true);
    router.push("/creators");
  }

  const activeFiltersCount = useMemo(() => {
    const values = [
      q,
      platform,
      niche,
      lang,
      minPrice,
      maxPrice,
      sort !== "recent" ? sort : "",
      !verifiedOnly && canShowUnverified ? "unverified" : "",
    ];
    return values.filter(Boolean).length;
  }, [canShowUnverified, lang, maxPrice, minPrice, niche, platform, q, sort, verifiedOnly]);

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Фильтры</span>
        {activeFiltersCount ? (
          <span className="text-xs text-muted-foreground">Активно: {activeFiltersCount}</span>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Поиск</label>
        <Input placeholder="имя или био" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Платформа</label>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">Любая</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Ниша</label>
          <Select value={niche} onChange={(e) => setNiche(e.target.value)}>
            <option value="">Любая</option>
            {NICHES.map((n) => (
              <option key={n} value={n}>
                {NICHE_LABELS[n]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Мин. цена за видео</label>
          <Input inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Макс. цена за видео</label>
          <Input inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Язык</label>
          <Select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="">Любой</option>
            {LANG_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Сортировка</label>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Недавние</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
            <option value="rating_desc">Рейтинг</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {canShowUnverified ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Только верифицированные
          </label>
        ) : (
          <div className="text-xs text-muted-foreground">
            Показываются только публичные и верифицированные креаторы.
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Цены в {CURRENCY_LABELS[CURRENCIES[0]] ?? "RUB"} если указаны.
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={apply}>
          Применить
        </Button>
        <Button className="flex-1" variant="outline" onClick={reset}>
          Сброс
        </Button>
      </div>
    </div>
  );
}

