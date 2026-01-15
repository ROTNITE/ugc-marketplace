"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

type JobOption = { id: string; title: string };

export function InviteCreatorDialog({
  creatorId,
  jobs,
}: {
  creatorId: string;
  jobs: JobOption[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileCta, setProfileCta] = useState<string | null>(null);

  async function send() {
    if (!jobId) {
      setError("Выберите заказ.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setProfileCta(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, creatorId, message }),
      });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const errorMap: Record<string, string> = {
            CREATOR_NOT_FOUND: "Креатор не найден. Обновите страницу и попробуйте снова.",
            CREATOR_PROFILE_REQUIRED: "Креатор ещё не заполнил профиль и не включил публичность.",
            CREATOR_NOT_PUBLIC: "Креатор не разрешил показывать профиль брендам.",
            CREATOR_NOT_VERIFIED: "Креатор ещё не подтверждён, приглашение недоступно.",
            BRAND_PROFILE_INCOMPLETE: "Заполните профиль бренда перед приглашением креатора.",
            INVITE_ONLY_FOR_PUBLISHED: data?.message ?? "Приглашать можно только опубликованные заказы.",
          };
          setError(errorMap[data?.error] ?? data?.error ?? "Не удалось отправить приглашение.");
          if (data?.completeProfile) {
            setProfileCta(data?.profileUrl ?? "/dashboard/profile");
          }
          return;
        }
      setSuccess("Приглашение отправлено.");
      if (data?.conversationId) {
        router.prefetch(`/dashboard/inbox/${data.conversationId}`);
      }
    } catch {
      setError("Не удалось отправить приглашение.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!jobs.length) {
    return (
      <Alert variant="info" title="Нет опубликованных заказов">
        Сначала опубликуйте заказ, чтобы пригласить креатора.
      </Alert>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Пригласить в заказ</h3>
          <p className="text-xs text-muted-foreground">Выберите опубликованный заказ и добавьте сообщение.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsOpen((v) => !v)}>
          {isOpen ? "Скрыть" : "Открыть"}
        </Button>
      </div>

      {isOpen ? (
        <div className="space-y-3">
          {error ? (
            <Alert variant="warning" title="Ошибка">
              <div className="space-y-2">
                <p>{error}</p>
                {profileCta ? (
                  <a className="text-primary hover:underline text-sm" href={profileCta}>
                    Перейти в профиль
                  </a>
                ) : null}
              </div>
            </Alert>
          ) : null}
          {success ? (
            <Alert variant="success" title="Готово">
              {success}
            </Alert>
          ) : null}

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Заказ</label>
            <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Сообщение (опционально)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Пара слов о том, что нужно сделать"
            />
          </div>

          <Button onClick={send} disabled={isLoading}>
            {isLoading ? "Отправка..." : "Отправить приглашение"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
