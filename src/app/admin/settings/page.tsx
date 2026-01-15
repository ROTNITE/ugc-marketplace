import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";
import { getPlatformSettings } from "@/lib/platform-settings";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </Container>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Эта страница доступна только администраторам.
        </Alert>
      </Container>
    );
  }

  const settings = await getPlatformSettings();

  return (
    <Container size="lg" className="py-10 space-y-6">
      <PageHeader
        title="Настройки платформы"
        description="Комиссия и валюта по умолчанию."
        eyebrow={
          <Link className="hover:text-foreground" href="/admin">
            Назад в админку
          </Link>
        }
      />

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
    </Container>
  );
}
