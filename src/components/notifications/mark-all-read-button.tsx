"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function MarkAllReadButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAll() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось отметить прочитанными.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось отметить прочитанными.");
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
      <Button size="sm" variant="outline" onClick={markAll} disabled={isLoading}>
        {isLoading ? "Обновление..." : "Отметить всё прочитанным"}
      </Button>
    </div>
  );
}
