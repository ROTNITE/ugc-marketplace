"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobApplySchema } from "@/lib/validators";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

type Values = z.infer<typeof jobApplySchema>;

export function JobApplyForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [profileCta, setProfileCta] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(jobApplySchema),
    defaultValues: { message: "", priceQuote: undefined },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        setOk(null);
        setProfileCta(null);

        const res = await fetch(`/api/jobs/${jobId}/apply`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...values,
            priceQuote: values.priceQuote ? Number(values.priceQuote) : undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.message ?? data?.error ?? "Не удалось отправить отклик.");
          if (data?.completeProfile) {
            setProfileCta(data?.profileUrl ?? "/dashboard/profile");
          }
          return;
        }

        setOk("Отклик отправлен! Бренд увидит вашу заявку.");
        router.refresh();
      })}
    >
      {error ? (
        <Alert variant="danger" title="Ошибка">
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
      {ok ? <Alert variant="success" title="Готово">{ok}</Alert> : null}

      <div className="space-y-1">
        <label className="text-sm font-medium">Сообщение (опционально)</label>
        <Textarea placeholder="Коротко: опыт, как снимаете, сроки, примеры." {...form.register("message")} />
        {form.formState.errors.message ? (
          <p className="text-xs text-rose-600">{form.formState.errors.message.message}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Ваша цена за пакет (опционально)</label>
        <Input inputMode="numeric" placeholder="например 10000" {...form.register("priceQuote", { valueAsNumber: true })} />
        {form.formState.errors.priceQuote ? (
          <p className="text-xs text-rose-600">{form.formState.errors.priceQuote.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? "Отправляем..." : "Откликнуться"}
      </Button>

      <p className="text-xs text-muted-foreground">
        ⚠️ В MVP: оплата и документы пока не автоматизированы. Договаривайтесь в чате, потом добавим
        эскроу/безопасную сделку.
      </p>
    </form>
  );
}
