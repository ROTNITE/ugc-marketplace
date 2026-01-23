"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TelegramAccount = {
  telegramUserId: string;
  telegramUsername?: string | null;
};

type TelegramBindingRequest = {
  expiresAt: string;
};

type Props = {
  account: TelegramAccount | null;
  pendingRequest?: TelegramBindingRequest | null;
};

export function TelegramBindingCard({ account, pendingRequest = null }: Props) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(pendingRequest?.expiresAt ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleSession, setStaleSession] = useState(false);

  useEffect(() => {
    if (!code) {
      setExpiresAt(pendingRequest?.expiresAt ?? null);
    }
  }, [pendingRequest?.expiresAt, code]);

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [expiresAt]);

  async function generateCode() {
    setIsLoading(true);
    setError(null);
    setStaleSession(false);
    try {
      const res = await fetch("/api/telegram/bind/request", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        if (data?.error?.code === "STALE_SESSION" || data?.error?.code === "SESSION_INVALID") {
          setStaleSession(true);
        }
        if (data?.requestId) {
          console.error("telegram:bind request failed", data.requestId);
        }
        setError(data?.error?.message ?? "Не удалось сгенерировать код.");
        return;
      }
      const payload = data?.data ?? data;
      setCode(payload?.code ?? null);
      setExpiresAt(payload?.expiresAt ?? null);
    } catch {
      setError("Не удалось сгенерировать код.");
    } finally {
      setIsLoading(false);
    }
  }

  async function unlink() {
    if (!confirm("Отвязать Telegram?")) return;
    setIsLoading(true);
    setError(null);
    setStaleSession(false);
    try {
      const res = await fetch("/api/telegram/bind/unlink", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        if (data?.error?.code === "STALE_SESSION" || data?.error?.code === "SESSION_INVALID") {
          setStaleSession(true);
        }
        if (data?.requestId) {
          console.error("telegram:bind unlink failed", data.requestId);
        }
        setError(data?.error?.message ?? "Не удалось отвязать Telegram.");
        return;
      }
      router.refresh();
    } catch {
      setError("Не удалось отвязать Telegram.");
    } finally {
      setIsLoading(false);
    }
  }

  const statusLabel = account ? "Привязан" : pendingRequest ? "Ожидает подтверждения" : "Не привязан";

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Telegram</h2>
          <p className="text-xs text-muted-foreground">
            Привяжите Telegram, чтобы получать уведомления от бота.
          </p>
        </div>
        <Badge variant="soft">{statusLabel}</Badge>
      </div>

      {error ? (
        <Alert variant="warning" title="Ошибка">
          <div className="space-y-2">
            <p>{error}</p>
            {staleSession ? (
              <a className="text-primary hover:underline text-sm" href="/api/auth/signout">
                Выйти и войти заново
              </a>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {account ? (
        <div className="space-y-2 text-sm">
          <div className="space-y-1">
            {account.telegramUsername ? (
              <div>
                Username: <span className="font-medium">@{account.telegramUsername}</span>
              </div>
            ) : null}
            <div>
              Telegram ID: <span className="font-medium">{account.telegramUserId}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={unlink} disabled={isLoading}>
            {isLoading ? "Отвязываем..." : "Отвязать"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Сгенерируйте код, отправьте его боту и дождитесь подтверждения.
          </p>

          {code ? (
            <div className="rounded-md border border-border/60 bg-muted/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">Код на привязку</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-widest">{code}</div>
              {formattedExpiry ? (
                <div className="mt-1 text-xs text-muted-foreground">Действует до {formattedExpiry}</div>
              ) : null}
            </div>
          ) : pendingRequest ? (
            <Alert variant="info" title="Ожидает подтверждения">
              Код уже создан. Подтвердите привязку через бота
              {formattedExpiry ? ` (до ${formattedExpiry}).` : "."}
            </Alert>
          ) : null}

          <Button size="sm" onClick={generateCode} disabled={isLoading}>
            {isLoading
              ? "Генерируем..."
              : code || pendingRequest
                ? "Обновить код"
                : "Сгенерировать код"}
          </Button>
        </div>
      )}
    </div>
  );
}
