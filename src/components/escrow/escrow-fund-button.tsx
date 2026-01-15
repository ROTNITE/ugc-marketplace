"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EscrowFundButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleFund() {
    if (isSending) return;
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/escrow/${jobId}/fund`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось пополнить эскроу.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось пополнить эскроу.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={handleFund} disabled={isSending}>
        {isSending ? "Пополняем..." : "Пополнить эскроу"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

