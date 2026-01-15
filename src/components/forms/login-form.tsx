"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });

        if (!res || res.error) {
          setError("Неверный email или пароль.");
          return;
        }

        router.push(next);
        router.refresh();
      })}
    >
      {error ? <Alert variant="danger" title="Ошибка">{error}</Alert> : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input type="email" placeholder="you@example.com" {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Пароль</label>
        <Input type="password" placeholder="••••••••" {...form.register("password")} />
        {form.formState.errors.password ? (
          <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Входим..." : "Войти"}
      </Button>
    </form>
  );
}
