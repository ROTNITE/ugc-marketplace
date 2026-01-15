import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";
import { getPlatformSettings } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
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

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только администраторам.
        </Alert>
      </div>
    );
  }

  const settings = await getPlatformSettings();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
          Назад в админку
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки платформы</h1>
        <p className="text-sm text-muted-foreground">Комиссия и валюта по умолчанию.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Финансы</CardTitle>
          <CardDescription>Изменения применяются сразу после сохранения.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformSettingsForm
            commissionBps={settings.commissionBps}
            defaultCurrency={settings.defaultCurrency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
