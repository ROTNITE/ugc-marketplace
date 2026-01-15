"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type JobModerationActionsProps = {
  jobId: string;
};

export function JobModerationActions({ jobId }: JobModerationActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MIN_REASON = 10;

  async function handleApprove() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось одобрить.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось одобрить.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    setIsLoading(true);
    setError(null);
    try {
      if (reason.trim().length < MIN_REASON) {
        setError(`Причина должна быть не короче ${MIN_REASON} символов`);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/jobs/${jobId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось отклонить.");
        return;
      }
      setReason("");
      router.refresh();
    } catch {
      setError("Не удалось отклонить.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleApprove} disabled={isLoading}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={isLoading}>
          Reject
        </Button>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина отклонения (мин. 10 символов)"
        rows={3}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
