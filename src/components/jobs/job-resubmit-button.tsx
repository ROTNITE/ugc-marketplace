"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = { jobId: string };

export function JobResubmitButton({ jobId }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/resubmit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const reason = data?.error ?? "Не удалось отправить на модерацию.";
        setError(reason === "ALREADY_APPROVED" ? "Заказ уже одобрен." : reason);
        return;
      }
      setMessage("Отправлено на модерацию. Мы обновим статус после проверки.");
      router.refresh();
    } catch {
      setError("Не удалось отправить на модерацию. Попробуйте позже.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Отправляем..." : "Отправить на модерацию снова"}
      </Button>
      {message ? <p className="text-xs text-success">{message}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}


