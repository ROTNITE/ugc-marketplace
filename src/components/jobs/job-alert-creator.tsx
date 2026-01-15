"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

function toCents(value: number | null) {
  if (!value || Number.isNaN(value)) return null;
  return Math.max(0, Math.round(value * 100));
}

export function JobAlertCreator() {
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileCta, setProfileCta] = useState<string | null>(null);

  const filters = useMemo(() => {
    const platform = searchParams.get("platform") || null;
    const niche = searchParams.get("niche") || null;
    const lang = searchParams.get("lang") || null;
    const minBudgetRaw = Number(searchParams.get("minBudget"));
    const maxBudgetRaw = Number(searchParams.get("maxBudget"));
    return {
      platform,
      niche,
      lang,
      minBudgetCents: toCents(Number.isFinite(minBudgetRaw) ? minBudgetRaw : null),
      maxBudgetCents: toCents(Number.isFinite(maxBudgetRaw) ? maxBudgetRaw : null),
    };
  }, [searchParams]);

  const defaultName = useMemo(() => {
    const parts = ["Алерт"];
    if (filters.platform) parts.push(filters.platform);
    if (filters.niche) parts.push(filters.niche);
    if (filters.lang) parts.push(filters.lang);
    return parts.join(" · ");
  }, [filters]);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    setProfileCta(null);
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim() || defaultName,
        platform: filters.platform ?? undefined,
        niche: filters.niche ?? undefined,
        lang: filters.lang ?? undefined,
        minBudgetCents: filters.minBudgetCents ?? undefined,
        maxBudgetCents: filters.maxBudgetCents ?? undefined,
      };
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Не удалось создать алерт.");
        if (data?.completeProfile) {
          setProfileCta(data?.profileUrl ?? "/dashboard/profile");
        }
        return;
      }
      setSuccess("Алерт сохранён. Мы уведомим о новых заказах.");
      setName("");
    } catch {
      setError("Не удалось создать алерт.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Алерты на новые заказы</h3>
          <p className="text-xs text-muted-foreground">
            Сохраняйте фильтры и получайте уведомления о новых заказах.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsOpen((prev) => !prev)}>
          {isOpen ? "Скрыть" : "Создать алерт"}
        </Button>
      </div>

      {isOpen ? (
        <div className="space-y-3">
          {error ? (
            <Alert variant="warning" title="Ошибка">
              <div className="space-y-2">
                <p>{error}</p>
                {profileCta ? (
                  <a className="text-primary hover:underline text-sm" href={profileCta}>
                    Перейти в профиль
                  </a>
                ) : null}
              </div>
            </Alert>
          ) : null}
          {success ? (
            <Alert variant="success" title="Готово">
              {success}
            </Alert>
          ) : null}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Название алерта</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {filters.platform ? <span>Платформа: {filters.platform}</span> : null}
            {filters.niche ? <span>Ниша: {filters.niche}</span> : null}
            {filters.lang ? <span>Язык: {filters.lang}</span> : null}
            {filters.minBudgetCents !== null ? <span>Бюджет от: {filters.minBudgetCents / 100}</span> : null}
            {filters.maxBudgetCents !== null ? <span>Бюджет до: {filters.maxBudgetCents / 100}</span> : null}
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Сохраняем..." : "Сохранить алерт"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
