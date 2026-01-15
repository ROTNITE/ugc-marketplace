"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BrandApplicationActions({
  jobId,
  applicationId,
  disableAccept,
}: {
  jobId: string;
  applicationId: string;
  disableAccept?: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (isLoading || disableAccept) return;
    if (!confirm("Принять отклик? Остальные отклики будут отклонены.")) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/jobs/${jobId}/applications/${applicationId}/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось принять отклик.");
        return;
      }

      const payload = data?.data ?? data;
      if (payload?.conversationId) {
        router.push(`/dashboard/inbox/${payload.conversationId}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Не удалось принять отклик.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (isLoading) return;
    if (!confirm("Отклонить отклик?")) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/jobs/${jobId}/applications/${applicationId}/reject`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось отклонить отклик.");
        return;
      }

      router.refresh();
    } catch {
      setError("Не удалось отклонить отклик.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={handleAccept} disabled={isLoading || disableAccept}>
          {isLoading ? "Обрабатываем..." : "Принять"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleReject} disabled={isLoading}>
          Отклонить
        </Button>
      </div>
      {disableAccept ? (
        <p className="text-xs text-muted-foreground">Исполнитель уже выбран.</p>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

