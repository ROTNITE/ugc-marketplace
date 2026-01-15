"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ClearAllNotificationsButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clearAll() {
    if (!confirm("Очистить все уведомления?")) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/clear", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось очистить уведомления.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось очистить уведомления.");
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
      <Button size="sm" variant="outline" onClick={clearAll} disabled={isLoading}>
        {isLoading ? "Очищаем..." : "Очистить уведомления"}
      </Button>
    </div>
  );
}
