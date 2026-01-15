"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CreatorVerificationActionsProps = {
  creatorProfileId: string;
};

export function CreatorVerificationActions({ creatorProfileId }: CreatorVerificationActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const MIN_REASON = 10;

  async function handleVerify() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/creators/${creatorProfileId}/verify`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to verify.");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to verify.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!confirm("Reject this verification?")) return;
    setIsLoading(true);
    setError(null);
    try {
      if (reason.trim().length < MIN_REASON) {
        setError(`Причина должна быть не короче ${MIN_REASON} символов`);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/creators/${creatorProfileId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to reject.");
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to reject.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleVerify} disabled={isLoading}>
          Mark verified
        </Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={isLoading}>
          Reject
        </Button>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина отказа (мин. 10 символов)"
        rows={3}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
