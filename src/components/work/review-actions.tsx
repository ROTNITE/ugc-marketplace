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
  const [isApproving, setIsApproving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  async function approve() {
    if (isApproving || isRequesting) return;
    setIsApproving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review/approve`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        const message = data?.error?.message ?? "Не удалось подтвердить.";
        setError(message);
        return;
      }
      const warning = data?.data?.warning ?? data?.warning;
      if (warning) {
        setNotice(warning);
      }
      router.refresh();
    } catch {
      setError("Не удалось подтвердить.");
    } finally {
      setIsApproving(false);
    }
  }

  async function requestChanges() {
    if (isApproving || isRequesting) return;
    if (!comment.trim()) {
      setError("Добавьте комментарий к доработке.");
      return;
    }
    setIsRequesting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/review/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        const message = data?.error?.message ?? "Не удалось запросить правки.";
        setError(message);
        return;
      }
      setComment("");
      router.refresh();
    } catch {
      setError("Не удалось запросить правки.");
    } finally {
      setIsRequesting(false);
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
        <Button variant="outline" onClick={requestChanges} disabled={isApproving || isRequesting}>
          {isRequesting ? "Отправляем..." : "Запросить правки"}
        </Button>
        <Button onClick={approve} disabled={isApproving || isRequesting}>
          {isApproving ? "Подтверждаем..." : "Одобрить"}
        </Button>
      </div>
    </div>
  );
}
