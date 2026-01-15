"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

type Props = {
  disputeId: string;
};

export function DisputeResolveActions({ disputeId }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(path: "resolve-refund" | "resolve-release") {
    const confirmed =
      path === "resolve-refund"
        ? confirm("Решить спор возвратом средств?")
        : confirm("Решить спор выплатой креатору?");
    if (!confirmed) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Не удалось выполнить действие.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось выполнить действие.");
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Комментарий администратора</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Опционально: поясните решение"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={() => resolve("resolve-refund")} disabled={isLoading}>
          Решить: Refund
        </Button>
        <Button onClick={() => resolve("resolve-release")} disabled={isLoading}>
          Решить: Release
        </Button>
      </div>
    </div>
  );
}
