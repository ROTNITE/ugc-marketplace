"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

const REASON_LABELS: Record<string, string> = {
  QUALITY: "Качество",
  DEADLINE: "Сроки",
  COMMUNICATION: "Коммуникация",
  OTHER: "Другое",
};

type Props = {
  jobId: string;
  disabled?: boolean;
};

export function DisputeOpenForm({ jobId, disabled }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("QUALITY");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function openDispute() {
    if (disabled) return;
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/dispute/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось открыть спор.");
        return;
      }
      setNotice("Спор открыт. Админ подключится к разбору.");
      router.refresh();
    } catch {
      setError("Не удалось открыть спор.");
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
        <Alert variant="info" title="Готово">
          {notice}
        </Alert>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Причина</label>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {Object.entries(REASON_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Комментарий</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опишите проблему и контекст"
          />
        </div>
      </div>
      <Button onClick={openDispute} disabled={isLoading || disabled}>
        {isLoading ? "Открываем..." : "Открыть спор"}
      </Button>
    </div>
  );
}
