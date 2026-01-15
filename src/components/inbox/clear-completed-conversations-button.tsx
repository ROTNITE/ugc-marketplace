"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ClearCompletedConversationsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (!confirm("Удалить все завершённые чаты?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations/clear", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось очистить чаты.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось очистить чаты.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleClear} disabled={loading} aria-label="Очистить завершённые чаты">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

