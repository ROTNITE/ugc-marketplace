"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WithdrawButton({
  applicationId,
  label = "Отозвать",
  size = "sm",
  variant = "outline",
  className,
}: {
  applicationId: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleWithdraw() {
    if (isSending) return;
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch(`/api/applications/${applicationId}/withdraw`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось отозвать отклик.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось отозвать отклик.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant={variant} size={size} onClick={handleWithdraw} disabled={isSending} className={className}>
        {isSending ? "Отзываем..." : label}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

