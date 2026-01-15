import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { JobCreateWizard } from "@/components/forms/job-create-wizard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </div>
    );
  }

  if (user.role !== "BRAND") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Только для брендов">
          Создавать заказы могут только аккаунты бренда.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Новый заказ</CardTitle>
          <CardDescription>Базовый wizard. Позже сделаем более мощный конструктор брифа.</CardDescription>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard/jobs">
            К списку заказов
          </Link>
        </CardHeader>
        <CardContent>
          <JobCreateWizard />
        </CardContent>
      </Card>
    </div>
  );
}
