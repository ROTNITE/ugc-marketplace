"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/constants";
import type { Currency } from "@prisma/client";

type Props = {
  defaultUserId?: string;
  defaultCurrency?: Currency;
};

export function FinanceAdjustForm({ defaultUserId, defaultCurrency }: Props) {
  const [userId, setUserId] = useState(defaultUserId ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency ?? "RUB");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    const cents = Math.round(Number(amount) * 100);
    if (!userId) {
      setError("Укажите userId.");
      return;
    }
    if (!Number.isFinite(cents) || cents === 0) {
      setError("Введите сумму (можно с минусом).");
      return;
    }
    if (!reason.trim()) {
      setError("Укажите причину.");
      return;
    }

    const confirmed = window.confirm("Подтвердите корректировку баланса.");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/finance/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amountCents: cents,
          currency,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось сохранить корректировку.");
        return;
      }
      setSuccess("Корректировка применена.");
      setAmount("");
      setReason("");
    } catch {
      setError("Не удалось сохранить корректировку.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
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

      <div className="space-y-1">
        <label className="text-sm font-medium">User ID</label>
        <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid пользователя" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Сумма</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Пример: 100 (начислить) или -50 (списать)"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Валюта</label>
          <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {CURRENCY_LABELS[item] ?? item}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Причина</label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например: тестовое начисление" />
      </div>

      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Сохраняем..." : "Применить корректировку"}
      </Button>
    </div>
  );
}
