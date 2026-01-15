"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function AlertRowActions({ alertId, isActive }: { alertId: string; isActive: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось обновить алерт.");
        return;
      }
      location.reload();
    } catch {
      setError("Не удалось обновить алерт.");
    } finally {
      setIsLoading(false);
    }
  }

  async function remove() {
    if (!confirm("Удалить алерт?")) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось удалить алерт.");
        return;
      }
      location.reload();
    } catch {
      setError("Не удалось удалить алерт.");
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
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={isActive ? "outline" : "primary"} onClick={() => toggle(!isActive)} disabled={isLoading}>
          {isActive ? "Выключить" : "Включить"}
        </Button>
        <Button size="sm" variant="destructive" onClick={remove} disabled={isLoading}>
          Удалить
        </Button>
      </div>
    </div>
  );
}
