"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

type Mode = "message" | "evidence" | "admin-note";

type Props = {
  disputeId: string;
  mode: Mode;
  disabled?: boolean;
};

const TITLES: Record<Mode, string> = {
  message: "Сообщение",
  evidence: "Ссылки-доказательства",
  "admin-note": "Комментарий администратора",
};

export function DisputeMessageForm({ disputeId, mode, disabled }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEvidence = mode === "evidence";
  const kind = mode === "message" ? "MESSAGE" : mode === "evidence" ? "EVIDENCE_LINK" : "ADMIN_NOTE";

  const addLink = () => {
    const value = linkInput.trim();
    if (!value) return;
    setLinks((prev) => [...prev, value].slice(0, 10));
    setLinkInput("");
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  async function submit() {
    if (disabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload =
        kind === "EVIDENCE_LINK"
          ? { kind, links }
          : {
              kind,
              text,
            };
      const res = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Не удалось отправить сообщение.");
        return;
      }
      if (isEvidence) {
        setLinks([]);
        setLinkInput("");
      } else {
        setText("");
      }
      router.refresh();
    } catch {
      setError("Не удалось отправить сообщение.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{TITLES[mode]}</div>
      {error ? (
        <Alert variant="warning" title="Ошибка">
          {error}
        </Alert>
      ) : null}
      {isEvidence ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
              placeholder="https://..."
            />
            <Button variant="outline" onClick={addLink} disabled={isLoading || disabled}>
              Добавить
            </Button>
          </div>
          {links.length > 0 ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              {links.map((link, index) => (
                <div key={`${link}-${index}`} className="flex items-center justify-between gap-2">
                  <span className="truncate">{link}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeLink(index)} disabled={isLoading || disabled}>
                    Удалить
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Опишите ситуацию"
        />
      )}
      <Button onClick={submit} disabled={isLoading || disabled}>
        {isLoading ? "Отправляем..." : "Отправить"}
      </Button>
    </div>
  );
}
