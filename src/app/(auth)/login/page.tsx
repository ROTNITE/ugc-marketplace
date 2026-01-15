import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Войдите в аккаунт, чтобы откликаться или публиковать задания.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link className="text-primary hover:underline" href="/register">
              Регистрация
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
