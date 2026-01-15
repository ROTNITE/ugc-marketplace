"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

type PayoutRequestFormProps = {
  maxAmountCents: number;
  currencyLabel: string;
  disabledReason?: string | null;
};

export function PayoutRequestForm({ maxAmountCents, currencyLabel, disabledReason }: PayoutRequestFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const maxAmount = Math.round(maxAmountCents / 100);
  const isDisabled = Boolean(disabledReason) || maxAmountCents <= 0;

  async function submitRequest() {
    if (isDisabled || isSending) return;
    setError(null);
    setSuccess(false);
    const normalizedAmount = Number(amount);
    const amountCents = Math.round(normalizedAmount * 100);

    if (!Number.isFinite(normalizedAmount) || amountCents <= 0) {
      setError("Введите корректную сумму.");
      return;
    }
    if (amountCents > maxAmountCents) {
      setError("Сумма больше доступного баланса.");
      return;
    }
    if (!payoutMethod.trim()) {
      setError("Укажите способ выплаты.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, payoutMethod }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data?.error?.message ?? data?.error ?? "Не удалось отправить заявку.";
        setError(message);
        return;
      }

      setAmount("");
      setPayoutMethod("");
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Не удалось отправить заявку.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {disabledReason ? (
        <Alert variant="info" title="Заявка недоступна">
          {disabledReason}
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="warning" title="Ошибка">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Заявка отправлена">
          Мы уведомим о статусе выплаты.
        </Alert>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium">Сумма</label>
        <Input
          type="number"
          min={0}
          step="0.01"
          disabled={isDisabled}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Доступно: ${maxAmount} ${currencyLabel}`}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Метод выплаты</label>
        <Textarea
          disabled={isDisabled}
          value={payoutMethod}
          onChange={(e) => setPayoutMethod(e.target.value)}
          placeholder="Например: USDT TRC20 <address> или Card **** 1234"
        />
      </div>
      <Button onClick={submitRequest} disabled={isSending || isDisabled}>
        {isSending ? "Отправка..." : "Запросить выплату"}
      </Button>
    </div>
  );
}
