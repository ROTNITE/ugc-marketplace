"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function InvitationActions({ invitationId, jobId }: { invitationId: string; jobId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileCta, setProfileCta] = useState<string | null>(null);

  async function handle(action: "accept" | "decline") {
    setIsLoading(true);
    setError(null);
    setProfileCta(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        const details = data?.error?.details;
        setError(data?.error?.message ?? "Не удалось выполнить действие.");
        if (details?.completeProfile || details?.verifyProfile) {
          setProfileCta(details?.profileUrl ?? "/dashboard/profile");
        }
        return;
      }
      if (action === "accept") {
        router.push(`/jobs/${jobId}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Не удалось выполнить действие.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
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
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => handle("accept")} disabled={isLoading}>
          Принять
        </Button>
        <Button size="sm" variant="outline" onClick={() => handle("decline")} disabled={isLoading}>
          Отказать
        </Button>
      </div>
    </div>
  );
}
