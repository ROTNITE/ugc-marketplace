"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  PLATFORM_LABELS,
  NICHE_LABELS,
  PLATFORMS,
  NICHES,
  CURRENCIES,
  CURRENCY_LABELS,
  RIGHTS_PACKAGES,
  RIGHTS_PACKAGE_LABELS,
} from "@/lib/constants";

const POPULAR_FORMATS = ["REVIEW", "UNBOXING", "HOW_TO", "TESTIMONIAL", "NO_FACE", "TALKING_HEAD"] as const;
const LANG_OPTIONS = ["ru", "en", "uk"] as const;

function parseInitialList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseBool(value: string | null) {
  if (!value) return false;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

export function JobFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [platform, setPlatform] = useState(sp.get("platform") ?? "");
  const [niche, setNiche] = useState(sp.get("niche") ?? "");
  const [currency, setCurrency] = useState(sp.get("currency") ?? "");
  const [rightsPackage, setRightsPackage] = useState(sp.get("rightsPackage") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "new");
  const [minBudget, setMinBudget] = useState(sp.get("minBudget") ?? "");
  const [maxBudget, setMaxBudget] = useState(sp.get("maxBudget") ?? "");
  const [minDeliverables, setMinDeliverables] = useState(sp.get("minDeliverables") ?? "");
  const [maxDeliverables, setMaxDeliverables] = useState(sp.get("maxDeliverables") ?? "");
  const [minDurationSec, setMinDurationSec] = useState(sp.get("minDurationSec") ?? "");
  const [maxDurationSec, setMaxDurationSec] = useState(sp.get("maxDurationSec") ?? "");
  const [formats, setFormats] = useState<string[]>(parseInitialList(sp.get("formats")));
  const [needsPosting, setNeedsPosting] = useState(parseBool(sp.get("needsPosting")));
  const [needsWhitelisting, setNeedsWhitelisting] = useState(parseBool(sp.get("needsWhitelisting")));
  const [shippingRequired, setShippingRequired] = useState(parseBool(sp.get("shippingRequired")));
  const [lang, setLang] = useState(sp.get("lang") ?? "");

  const currentQuery = useMemo(() => new URLSearchParams(sp.toString()), [sp]);

  function apply() {
    const qParams = new URLSearchParams(currentQuery);

    const set = (key: string, value: string | undefined | null) => {
      if (value && value.length > 0) qParams.set(key, value);
      else qParams.delete(key);
    };

    set("q", q);
    set("platform", platform);
    set("niche", niche);
    set("currency", currency);
    set("rightsPackage", rightsPackage);
    set("sort", sort);
    set("minBudget", minBudget);
    set("maxBudget", maxBudget);
    set("minDeliverables", minDeliverables);
    set("maxDeliverables", maxDeliverables);
    set("minDurationSec", minDurationSec);
    set("maxDurationSec", maxDurationSec);
    set("lang", lang);

    if (formats.length) qParams.set("formats", formats.join(","));
    else qParams.delete("formats");

    if (needsPosting) qParams.set("needsPosting", "true");
    else qParams.delete("needsPosting");
    if (needsWhitelisting) qParams.set("needsWhitelisting", "true");
    else qParams.delete("needsWhitelisting");
    if (shippingRequired) qParams.set("shippingRequired", "true");
    else qParams.delete("shippingRequired");

    qParams.delete("page"); // future pagination

    router.push(`/jobs?${qParams.toString()}`);
  }

  function reset() {
    setQ("");
    setPlatform("");
    setNiche("");
    setCurrency("");
    setRightsPackage("");
    setSort("new");
    setMinBudget("");
    setMaxBudget("");
    setMinDeliverables("");
    setMaxDeliverables("");
    setMinDurationSec("");
    setMaxDurationSec("");
    setFormats([]);
    setNeedsPosting(false);
    setNeedsWhitelisting(false);
    setShippingRequired(false);
    setLang("");
    router.push("/jobs");
  }

  const activeFiltersCount = useMemo(() => {
    const values = [
      q,
      platform,
      niche,
      currency,
      rightsPackage,
      minBudget,
      maxBudget,
      minDeliverables,
      maxDeliverables,
      minDurationSec,
      maxDurationSec,
      formats.length ? "1" : "",
      needsPosting ? "1" : "",
      needsWhitelisting ? "1" : "",
      shippingRequired ? "1" : "",
      lang,
      sort !== "new" ? sort : "",
    ];
    return values.filter(Boolean).length;
  }, [
    currency,
    formats.length,
    lang,
    maxBudget,
    maxDeliverables,
    maxDurationSec,
    minBudget,
    minDeliverables,
    minDurationSec,
    needsPosting,
    needsWhitelisting,
    niche,
    platform,
    q,
    rightsPackage,
    shippingRequired,
    sort,
  ]);

  function toggleFormat(fmt: string) {
    setFormats((prev) => (prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]));
  }

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
        <Input placeholder="название или описание" value={q} onChange={(e) => setQ(e.target.value)} />
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
          <label className="text-xs text-muted-foreground">Мин. бюджет</label>
          <Input inputMode="numeric" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Макс. бюджет</label>
          <Input inputMode="numeric" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Мин. количество видео</label>
          <Input inputMode="numeric" value={minDeliverables} onChange={(e) => setMinDeliverables(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Макс. количество видео</label>
          <Input inputMode="numeric" value={maxDeliverables} onChange={(e) => setMaxDeliverables(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Мин. длительность (сек)</label>
          <Input inputMode="numeric" value={minDurationSec} onChange={(e) => setMinDurationSec(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Макс. длительность (сек)</label>
          <Input inputMode="numeric" value={maxDurationSec} onChange={(e) => setMaxDurationSec(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Валюта</label>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="">Любая</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Пакет прав</label>
          <Select value={rightsPackage} onChange={(e) => setRightsPackage(e.target.value)}>
            <option value="">Любой</option>
            {RIGHTS_PACKAGES.map((p) => (
              <option key={p} value={p}>
                {RIGHTS_PACKAGE_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Форматы</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {POPULAR_FORMATS.map((fmt) => (
            <label
              key={fmt}
              className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${
                formats.includes(fmt) ? "border-primary" : "border-border"
              }`}
            >
              <input
                type="checkbox"
                checked={formats.includes(fmt)}
                onChange={() => toggleFormat(fmt)}
                className="accent-primary"
              />
              <span>{fmt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={needsPosting}
            onChange={(e) => setNeedsPosting(e.target.checked)}
          />
          Нужна публикация у креатора
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={needsWhitelisting}
            onChange={(e) => setNeedsWhitelisting(e.target.checked)}
          />
          Нужен whitelisting / Spark
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={shippingRequired}
            onChange={(e) => setShippingRequired(e.target.checked)}
          />
          Нужна доставка продукта
        </label>
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
            <option value="new">Новые</option>
            <option value="budget">По бюджету</option>
          </Select>
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

