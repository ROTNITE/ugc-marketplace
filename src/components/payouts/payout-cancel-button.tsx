"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PayoutCancelButton({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleCancel() {
    if (isSending) return;
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch(`/api/payouts/${payoutId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось отменить заявку.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось отменить заявку.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" onClick={handleCancel} disabled={isSending}>
        {isSending ? "Отменяем..." : "Отменить"}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
