"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function CancelDealButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onCancel() {
    const confirmed = window.confirm("Отменить сделку? Эскроу (если пополнен) будет возвращен бренду.");
    if (!confirmed) return;
    const reason = window.prompt("Причина отмены (опционально)", "") ?? "";
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? data?.error ?? "Не удалось отменить сделку.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось отменить сделку.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <Alert variant="warning" title="Ошибка">
          {error}
        </Alert>
      ) : null}
      <Button variant="destructive" onClick={onCancel} disabled={isLoading}>
        {isLoading ? "Отменяем..." : "Отменить сделку"}
      </Button>
    </div>
  );
}
