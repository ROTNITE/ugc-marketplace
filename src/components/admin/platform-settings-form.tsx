"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/constants";
import type { Currency } from "@prisma/client";

type Props = {
  commissionBps: number;
  defaultCurrency: Currency;
};

export function PlatformSettingsForm({ commissionBps, defaultCurrency }: Props) {
  const [bps, setBps] = useState(String(commissionBps));
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        commissionBps: Number.parseInt(bps, 10),
        defaultCurrency: currency,
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось сохранить настройки.");
        return;
      }

      setSuccess("Настройки сохранены.");
    } catch {
      setError("Не удалось сохранить настройки.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="warning" title="Ошибка">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Готово">
          {success}
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Комиссия (bps)</label>
          <Input
            type="number"
            min={0}
            max={10000}
            value={bps}
            onChange={(event) => setBps(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Например: 1500 = 15%.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Валюта по умолчанию</label>
          <Select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {CURRENCY_LABELS[item] ?? item}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Используется для новых кошельков, если валюта не задана.
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Сохраняем..." : "Сохранить"}
      </Button>
    </div>
  );
}
