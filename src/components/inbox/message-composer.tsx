"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const trimmed = body.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || isSending) return;

    setError(null);
    setIsSending(true);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error?.message ?? data?.error ?? "Не удалось отправить сообщение.";
        setError(message);
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Не удалось отправить сообщение.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Напишите сообщение..."
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Отправьте короткое сообщение и дождитесь ответа.
        </p>
        <Button type="submit" disabled={!trimmed || isSending}>
          {isSending ? "Отправляем..." : "Отправить"}
        </Button>
      </div>
      {error ? (
        <Alert variant="danger" title="Ошибка">
          {error}
        </Alert>
      ) : null}
    </form>
  );
}
