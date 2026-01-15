"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

type ReviewFormProps = {
  jobId: string;
  toLabel: string;
};

export function ReviewForm({ jobId, toLabel }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit() {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          rating: Number(rating),
          text: text.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось оставить отзыв.");
        return;
      }
      setSuccess(true);
      setText("");
      router.refresh();
    } catch {
      setError("Не удалось оставить отзыв.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? (
        <Alert variant="warning" title="Ошибка">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Отзыв отправлен">
          Спасибо за отзыв!
        </Alert>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Оценка</label>
          <Select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground md:flex md:items-end">
          Отзыв для: {toLabel}
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Комментарий (опционально)</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Коротко опишите опыт работы"
        />
      </div>
      <Button size="sm" onClick={submit} disabled={isLoading}>
        {isLoading ? "Отправка..." : "Оставить отзыв"}
      </Button>
    </div>
  );
}
