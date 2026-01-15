"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PauseProps = { jobId: string; status: string };

export function JobPauseToggle({ jobId, status }: PauseProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaused = status === "PAUSED";

  async function handleToggle() {
    setLoading(true);
    setError(null);
    try {
      const url = isPaused ? `/api/jobs/${jobId}/unpause` : `/api/jobs/${jobId}/pause`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось обновить статус.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось обновить статус.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleToggle} disabled={loading}>
        {loading ? "Сохраняем..." : isPaused ? "Возобновить публикацию" : "Поставить на паузу"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function JobDuplicateButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDuplicate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        setError(data?.error ?? "Не удалось дублировать.");
        return;
      }
      router.push(`/dashboard/jobs/${data.id}/edit`);
    } catch {
      setError("Не удалось дублировать.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={loading}>
        {loading ? "Дублируем..." : "Дублировать"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

