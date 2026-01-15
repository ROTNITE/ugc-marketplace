"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

export function AdminPayoutActions({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function approve() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось подтвердить.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось подтвердить.");
    } finally {
      setIsLoading(false);
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setError("Укажите причину отклонения.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось отклонить.");
        return;
      }
      setReason("");
      router.refresh();
    } catch {
      setError("Не удалось отклонить.");
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
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Причина для отклонения</label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например: неверные реквизиты" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={reject} disabled={isLoading}>
          Отклонить
        </Button>
        <Button onClick={approve} disabled={isLoading}>
          Одобрить
        </Button>
      </div>
    </div>
  );
}
