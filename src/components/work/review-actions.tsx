"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

export function ReviewActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function approve() {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось подтвердить.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.warning) {
        setNotice(data.warning);
      }
      router.refresh();
    } catch {
      setError("Не удалось подтвердить.");
    } finally {
      setIsLoading(false);
    }
  }

  async function requestChanges() {
    if (!comment.trim()) {
      setError("Добавьте комментарий к доработке.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось запросить правки.");
        return;
      }
      setComment("");
      router.refresh();
    } catch {
      setError("Не удалось запросить правки.");
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
      {notice ? (
        <Alert variant="info" title="Важно">
          {notice}
        </Alert>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium">Комментарий</label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Что поправить" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={requestChanges} disabled={isLoading}>
          Запросить правки
        </Button>
        <Button onClick={approve} disabled={isLoading}>
          Одобрить
        </Button>
      </div>
    </div>
  );
}
