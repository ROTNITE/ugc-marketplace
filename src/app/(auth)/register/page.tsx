import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <Card>
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт креатора или бренда.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="mt-4 text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link className="text-primary hover:underline" href="/login">
              Войти
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
