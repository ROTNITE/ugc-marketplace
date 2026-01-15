import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { JobCreateWizard } from "@/components/forms/job-create-wizard";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
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

  if (user.role !== "BRAND") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для брендов">
          Создавать заказы могут только аккаунты бренда.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-10 space-y-6">
      <PageHeader
        title="Новый заказ"
        description="Базовый wizard. Позже сделаем более мощный конструктор брифа."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard/jobs">
            Назад к заказам
          </Link>
        }
      />
      <Card>

        <CardContent>
          <JobCreateWizard />
        </CardContent>
      </Card>
    </Container>
  );
}
