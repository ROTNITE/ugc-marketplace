"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

type Item = { id: string; url: string; type: string };

export function SubmissionForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([{ id: crypto.randomUUID(), url: "", type: "FINAL_VIDEO" }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const types = [
    { value: "FINAL_VIDEO", label: "Финальный ролик" },
    { value: "RAW_FILES", label: "Исходники" },
    { value: "PROJECT_FILE", label: "Проектный файл" },
    { value: "OTHER", label: "Другое" },
  ];

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), url: "", type: "FINAL_VIDEO" }]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }

  async function submit() {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      note,
      items: items
        .filter((item) => item.url.trim().length > 0)
        .map((item) => ({ url: item.url.trim(), type: item.type })),
    };

    if (payload.items.length === 0) {
      setError("Добавьте хотя бы одну ссылку.");
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось отправить материалы.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Не удалось отправить материалы.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="danger" title="Ошибка">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Отправлено">
          Материалы отправлены на проверку.
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Комментарий (опционально)</label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">Ссылки</div>
        {items.map((item) => (
          <div key={item.id} className="grid gap-2 md:grid-cols-3 items-center">
            <Input
              className="md:col-span-2"
              value={item.url}
              onChange={(e) => updateItem(item.id, { url: e.target.value })}
              placeholder="https://..."
            />
            <div className="flex gap-2">
              <Select
                value={item.type}
                onChange={(e) => updateItem(item.id, { type: e.target.value })}
                className="w-full"
              >
                {types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="outline" onClick={() => removeItem(item.id)}>
                ×
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addItem} size="sm">
          Добавить ссылку
        </Button>
      </div>

      <Button onClick={submit} disabled={isSaving}>
        {isSaving ? "Отправляем..." : "Отправить материалы"}
      </Button>
    </div>
  );
}
