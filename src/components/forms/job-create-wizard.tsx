"use client";

import { useMemo, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { jobCreateSchema } from "@/lib/validators";
import {
  PLATFORMS,
  NICHES,
  PLATFORM_LABELS,
  NICHE_LABELS,
  CONTENT_FORMATS,
  CONTENT_FORMAT_LABELS,
  RIGHTS_PACKAGES,
  RIGHTS_PACKAGE_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
} from "@/lib/constants";
import { Stepper } from "@/components/ui/stepper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import type { ContentFormat, DeadlineType, MusicPolicy, RightsPackage } from "@prisma/client";

type Values = z.infer<typeof jobCreateSchema>;

type JobCreateWizardProps = {
  mode?: "create" | "edit";
  jobId?: string;
  initialValues?: Partial<Values>;
  submitPath?: string;
  hideDraftButton?: boolean;
  onSuccessRedirect?: string;
};

const steps = ["Основное", "Контент", "Дедлайн и бюджет", "Права", "Что отдавать", "Публикация"];

export function JobCreateWizard({
  mode = "create",
  jobId,
  initialValues,
  submitPath,
  hideDraftButton,
  onSuccessRedirect,
}: JobCreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [profileCta, setProfileCta] = useState<string | null>(null);

  const defaultDeadline = initialValues?.deadlineDate
    ? new Date(initialValues.deadlineDate as string | Date).toISOString()
    : initialValues?.deadlineDate === null
      ? undefined
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const defaults: Values = {
    title: "",
    description: "",
    platform: "TIKTOK",
    niche: "FOOD",
    deliverablesCount: 5,
    videoDurationSec: 15,
    contentFormats: [],
    needsPosting: false,
    needsWhitelisting: false,
    rightsPackage: "BASIC",
    usageTermDays: 90,
    revisionRounds: 1,
    revisionRoundsIncluded: 1,
    languages: ["ru"],
    shippingRequired: false,
    deliverablesIncludeRaw: false,
    deliverablesIncludeProjectFile: false,
    subtitlesRequired: false,
    scriptProvided: false,
    notes: "",
    budgetMin: 5000,
    budgetMax: 10000,
    currency: "RUB",
    deadlineType: "DATE",
    brief: {},
    status: initialValues?.status ?? "PUBLISHED",
    ...initialValues,
    deadlineDate: defaultDeadline,
    musicPolicy: (initialValues?.musicPolicy as MusicPolicy | undefined) ?? undefined,
  };

  const form = useForm<Values>({
    resolver: zodResolver(jobCreateSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });

  const isSubmitting = form.formState.isSubmitting;

  const stepFields: Record<number, FieldPath<Values>[]> = useMemo(
    () => ({
      0: ["title", "description", "platform", "niche"],
      1: ["deliverablesCount", "videoDurationSec", "contentFormats", "languages"],
      2: ["budgetMin", "budgetMax", "currency", "deadlineType", "deadlineDate"],
      3: ["needsPosting", "needsWhitelisting", "rightsPackage", "usageTermDays", "revisionRoundsIncluded", "revisionRounds"],
      4: [
        "deliverablesIncludeRaw",
        "deliverablesIncludeProjectFile",
        "subtitlesRequired",
        "musicPolicy",
        "scriptProvided",
        "notes",
        "shippingRequired",
      ],
      5: [],
    }),
    [],
  );

  async function nextStep() {
    setError(null);
    setProfileCta(null);
    const fields = stepFields[step] ?? [];
    const ok = await form.trigger(fields);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function prevStep() {
    setError(null);
    setProfileCta(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function toggleFormat(fmt: ContentFormat) {
    const current = form.getValues("contentFormats") ?? [];
    const exists = current.includes(fmt);
    const next = exists ? current.filter((x) => x !== fmt) : [...current, fmt];
    form.setValue("contentFormats", next, { shouldValidate: true });
  }

  function setDeadline(type: DeadlineType, date?: string) {
    form.setValue("deadlineType", type, { shouldValidate: true });
    if (type === "DATE" && date) {
      form.setValue("deadlineDate", date, { shouldValidate: true });
    } else if (type !== "DATE") {
      form.setValue("deadlineDate", undefined, { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-4">
      <Stepper steps={steps} currentIndex={step} />

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

      <form
        className="space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          setOk(null);
          setProfileCta(null);

          const payload = {
            ...values,
            status: mode === "edit" ? (initialValues?.status ?? values.status) : values.status,
            deadlineDate: values.deadlineDate ? new Date(values.deadlineDate).toISOString() : undefined,
          };

          const endpoint = submitPath ?? (mode === "edit" && jobId ? `/api/jobs/${jobId}` : "/api/jobs");
          const res = await fetch(endpoint, {
            method: mode === "edit" ? "PUT" : "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            setError(data?.message ?? data?.error ?? "Не удалось создать заказ.");
            if (data?.completeProfile) {
              setProfileCta(data?.profileUrl ?? "/dashboard/profile");
            }
            return;
          }

          const data = await res.json().catch(() => null);
          setOk(mode === "edit" ? "Изменения сохранены" : "Заказ сохранен!");
          const redirectTarget =
            onSuccessRedirect ??
            (mode === "edit" && jobId ? `/dashboard/jobs/${jobId}` : `/jobs/${data?.job?.id ?? ""}`);
          router.push(redirectTarget);
          router.refresh();
        })}
      >
        {step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название заказа</label>
              <Input placeholder="Напр.: 10 UGC-видео про напиток (15 сек)" {...form.register("title")} />
              {form.formState.errors.title ? (
                <p className="text-xs text-danger">{form.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Описание (опционально)</label>
              <Textarea
                placeholder="Коротко: продукт, стиль, требования, что отдавать, сколько правок."
                {...form.register("description")}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Платформа</label>
                <Select {...form.register("platform")}>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ниша</label>
                <Select {...form.register("niche")}>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>
                      {NICHE_LABELS[n]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Количество видео</label>
                <Input type="number" min={1} max={200} {...form.register("deliverablesCount", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Длительность (сек)</label>
                <Input type="number" min={5} max={180} {...form.register("videoDurationSec", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Форматы</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {CONTENT_FORMATS.map((fmt) => {
                  const checked = (form.watch("contentFormats") ?? []).includes(fmt);
                  return (
                    <label
                      key={fmt}
                      className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${
                        checked ? "border-primary" : "border-border"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFormat(fmt)}
                        className="accent-primary"
                      />
                      <span>{CONTENT_FORMAT_LABELS[fmt]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Язык(и)</label>
                <Input
                  placeholder="ru, en"
                  value={(form.watch("languages") ?? []).join(", ")}
                  onChange={(e) => {
                    const langs = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    form.setValue("languages", langs, { shouldValidate: true });
                  }}
                />
                <p className="text-xs text-muted-foreground">Через запятую. Например: ru, uk, kk</p>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Бюджет от</label>
                <Input type="number" min={1} {...form.register("budgetMin", { valueAsNumber: true })} />
                {form.formState.errors.budgetMin ? (
                  <p className="text-xs text-danger">{form.formState.errors.budgetMin.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Бюджет до</label>
                <Input type="number" min={1} {...form.register("budgetMax", { valueAsNumber: true })} />
                {form.formState.errors.budgetMax ? (
                  <p className="text-xs text-danger">{form.formState.errors.budgetMax.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Валюта</label>
                <Select {...form.register("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Дедлайн</label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Срочно (48ч)", value: "URGENT_48H" },
                  { label: "3-5 дней", value: "DAYS_3_5" },
                  { label: "Неделя+", value: "WEEK_PLUS" },
                  { label: "Дата", value: "DATE" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDeadline(item.value as DeadlineType)}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      form.watch("deadlineType") === item.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {form.watch("deadlineType") === "DATE" ? (
                <div className="space-y-2">
                  <Input
                    type="date"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return form.setValue("deadlineDate", undefined, { shouldValidate: true });
                      const iso = new Date(v).toISOString();
                      form.setValue("deadlineDate", iso, { shouldValidate: true });
                    }}
                  />
                  {form.formState.errors.deadlineDate ? (
                    <p className="text-xs text-danger">{form.formState.errors.deadlineDate.message as string}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Укажите дату сдачи.</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Выберите тип дедлайна. При выборе даты укажите конкретный день.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Пакет прав</label>
                <Select {...form.register("rightsPackage")}>
                  {RIGHTS_PACKAGES.map((p) => (
                    <option key={p} value={p}>
                      {RIGHTS_PACKAGE_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Срок использования (дней)</label>
                <Input type="number" min={30} max={3650} {...form.register("usageTermDays", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Раунды правок (включены)</label>
                <Select
                  value={String(form.watch("revisionRoundsIncluded") ?? 1)}
                  onChange={(e) => form.setValue("revisionRoundsIncluded", Number(e.target.value), { shouldValidate: true })}
                >
                  {[0, 1, 2].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Максимум правок</label>
                <Select
                  value={String(form.watch("revisionRounds") ?? 1)}
                  onChange={(e) => form.setValue("revisionRounds", Number(e.target.value), { shouldValidate: true })}
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-primary" {...form.register("needsPosting")} />
                Нужна публикация у креатора
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  {...form.register("needsWhitelisting")}
                />
                Нужен whitelisting / Spark / partnership
              </label>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  {...form.register("deliverablesIncludeRaw")}
                />
                Отдать исходники (raw)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  {...form.register("deliverablesIncludeProjectFile")}
                />
                Отдать проектный файл
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  {...form.register("subtitlesRequired")}
                />
                Нужны субтитры
              </label>
              <div className="space-y-2">
                <label className="text-sm font-medium">Музыка</label>
                <Select
                  value={form.watch("musicPolicy") ?? ""}
                  onChange={(e) =>
                    form.setValue("musicPolicy", (e.target.value || undefined) as MusicPolicy | undefined, {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="">Не выбрано</option>
                  <option value="BRAND_SAFE">Только без авторских прав</option>
                  <option value="TREND_OK">Можно тренды</option>
                  <option value="NO_MUSIC">Без музыки</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  {...form.register("scriptProvided")}
                />
                Сценарий предоставит бренд
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary"
                  {...form.register("shippingRequired")}
                />
                Нужно отправить продукт креатору (доставка)
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Примечания</label>
              <Textarea
                placeholder="Детали, ссылки на референсы, особенности продукта"
                {...form.register("notes")}
              />
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <Alert variant="info" title="Публикация">
              Проверьте данные и нажмите нужную кнопку. Опубликовать — уйдет на модерацию.
            </Alert>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-1 text-sm">
                <div className="font-medium text-foreground">Параметры</div>
                <div className="text-muted-foreground">
                  {form.getValues("deliverablesCount")} видео · {form.getValues("videoDurationSec")} сек ·{" "}
                  {form.getValues("platform")} · {form.getValues("niche")}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-1 text-sm">
                <div className="font-medium text-foreground">Бюджет</div>
                <div className="text-muted-foreground">
                  {form.getValues("budgetMin")}-{form.getValues("budgetMax")} {form.getValues("currency")}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-1 text-sm">
                <div className="font-medium text-foreground">Дедлайн</div>
                <div className="text-muted-foreground">
                  {form.getValues("deadlineType")}
                  {form.getValues("deadlineType") === "DATE" && form.getValues("deadlineDate")
                    ? ` · ${new Date(form.getValues("deadlineDate")!).toLocaleDateString()}`
                    : ""}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-1 text-sm">
                <div className="font-medium text-foreground">Права и публикация</div>
                <div className="text-muted-foreground">
                  {RIGHTS_PACKAGE_LABELS[form.getValues("rightsPackage") as RightsPackage]} ·{" "}
                  {form.getValues("usageTermDays")} дней · правки {form.getValues("revisionRoundsIncluded")} (
                  {form.getValues("revisionRounds")} макс.)
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-1 text-sm md:col-span-2">
                <div className="font-medium text-foreground">Что отдавать</div>
                <div className="text-muted-foreground space-y-1">
                  <div>
                    Исходники: {form.getValues("deliverablesIncludeRaw") ? "да" : "нет"} · Проектный файл:{" "}
                    {form.getValues("deliverablesIncludeProjectFile") ? "да" : "нет"}
                  </div>
                  <div>
                    Субтитры: {form.getValues("subtitlesRequired") ? "нужны" : "не нужны"} · Музыка:{" "}
                    {form.getValues("musicPolicy") || "не указано"}
                  </div>
                  <div>Сценарий: {form.getValues("scriptProvided") ? "бренд дает" : "нужен от креатора"}</div>
                  <div>Доставка продукта: {form.getValues("shippingRequired") ? "нужна" : "не нужна"}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-1 text-sm md:col-span-2">
                <div className="font-medium text-foreground">Примечания</div>
                <div className="text-muted-foreground">
                  {form.getValues("notes") ? form.getValues("notes") : "—"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (mode === "edit" ? "Сохраняем..." : "Сохраняем...") : mode === "edit" ? "Сохранить изменения" : "Опубликовать"}
              </Button>
              {mode !== "edit" && !hideDraftButton ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setError(null);
                    setProfileCta(null);
                    const payload = {
                      ...form.getValues(),
                      status: "DRAFT",
                      deadlineDate: form.getValues("deadlineDate")
                        ? new Date(form.getValues("deadlineDate")!).toISOString()
                        : undefined,
                    };
                    const res = await fetch("/api/jobs", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => null);
                      setError(data?.message ?? data?.error ?? "Не удалось сохранить черновик.");
                      if (data?.completeProfile) {
                        setProfileCta(data?.profileUrl ?? "/dashboard/profile");
                      }
                      return;
                    }
                    router.push(`/dashboard/jobs`);
                    router.refresh();
                  }}
                >
                  Сохранить черновик
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={prevStep} disabled={step === 0 || isSubmitting}>
            Назад
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" className="flex-1" onClick={nextStep} disabled={isSubmitting}>
              Далее
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Это базовый wizard. Позже добавим шаблоны, фильтры, черновики, предпросмотр и модерацию.
        </p>
      </form>
    </div>
  );
}


