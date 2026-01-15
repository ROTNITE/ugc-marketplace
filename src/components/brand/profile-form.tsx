"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

type BrandProfileFormValues = {
  companyName: string;
  website: string;
  description: string;
};

type BrandProfileFormProps = {
  initialProfile: BrandProfileFormValues;
};

export function BrandProfileForm({ initialProfile }: BrandProfileFormProps) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialProfile.companyName);
  const [website, setWebsite] = useState(initialProfile.website);
  const [description, setDescription] = useState(initialProfile.description);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function saveProfile() {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/brand/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          website,
          description,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok === false) {
        setError(data?.error?.message ?? "Не удалось сохранить профиль.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Не удалось сохранить профиль.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="warning" title="Ошибка сохранения">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Профиль обновлен">
          Данные сохранены и видны креаторам.
        </Alert>
      ) : null}

      <div id="brand-company" className="space-y-2 scroll-mt-24">
        <label className="text-sm font-medium">Название компании</label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Например, Демо бренд"
        />
      </div>

      <div id="brand-website" className="space-y-2 scroll-mt-24">
        <label className="text-sm font-medium">Сайт</label>
        <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
      </div>

      <div id="brand-description" className="space-y-2 scroll-mt-24">
        <label className="text-sm font-medium">Описание</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Коротко о бренде и продуктах"
        />
      </div>

      <Button onClick={saveProfile} disabled={isSaving}>
        {isSaving ? "Сохранение..." : "Сохранить"}
      </Button>
    </div>
  );
}
