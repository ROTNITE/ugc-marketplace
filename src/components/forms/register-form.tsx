"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type FormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "CREATOR",
      companyName: "",
    },
  });

  const role = form.watch("role");
  const isBrand = role === "BRAND";
  const isSubmitting = form.formState.isSubmitting;

  const roleHint = useMemo(() => {
    return isBrand
      ? "Аккаунт бренда — сможете публиковать задания и получать отклики."
      : "Аккаунт креатора — сможете откликаться на задания и собирать портфолио.";
  }, [isBrand]);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        setSuccess(null);

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "Не удалось создать аккаунт.");
          return;
        }

        setSuccess("Аккаунт создан. Входим...");
        const signInRes = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        if (!signInRes || signInRes.error) {
          router.push("/login");
          return;
        }

        router.push("/dashboard");
        router.refresh();
      })}
    >
      {error ? <Alert variant="danger" title="Ошибка">{error}</Alert> : null}
      {success ? <Alert variant="success" title="Готово">{success}</Alert> : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Тип аккаунта</label>
        <Select {...form.register("role")}>
          <option value="CREATOR">Креатор</option>
          <option value="BRAND">Бренд</option>
        </Select>
        <p className="text-xs text-muted-foreground">{roleHint}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Имя (опционально)</label>
        <Input placeholder="Как к вам обращаться" {...form.register("name")} />
      </div>

      {isBrand ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Название компании</label>
          <Input placeholder="ООО Ромашка / название бренда" {...form.register("companyName")} />
          {form.formState.errors.companyName ? (
            <p className="text-xs text-danger">{form.formState.errors.companyName.message}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input type="email" placeholder="you@example.com" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Пароль</label>
        <Input type="password" placeholder="минимум 8 символов" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-xs text-danger">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Создаём..." : "Создать аккаунт"}
      </Button>
    </form>
  );
}

