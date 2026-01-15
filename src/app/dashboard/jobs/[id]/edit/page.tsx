import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { JobCreateWizard } from "@/components/forms/job-create-wizard";
import { isBrandOwner } from "@/lib/authz";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: { id: string } }) {
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
          Редактировать заказы могут только аккаунты бренда.
        </Alert>
      </Container>
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      brandId: true,
      status: true,
      moderationStatus: true,
      title: true,
      description: true,
      platform: true,
      niche: true,
      deliverablesCount: true,
      videoDurationSec: true,
      contentFormats: true,
      needsPosting: true,
      needsWhitelisting: true,
      rightsPackage: true,
      usageTermDays: true,
      revisionRounds: true,
      revisionRoundsIncluded: true,
      languages: true,
      shippingRequired: true,
      deliverablesIncludeRaw: true,
      deliverablesIncludeProjectFile: true,
      subtitlesRequired: true,
      musicPolicy: true,
      scriptProvided: true,
      notes: true,
      budgetMin: true,
      budgetMax: true,
      currency: true,
      deadlineType: true,
      deadlineDate: true,
      brief: true,
      activeCreatorId: true,
    },
  });

  if (!job || !isBrandOwner(user, job.brandId)) {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Недоступно">
          Заказ не найден или вам недоступен.
        </Alert>
      </Container>
    );
  }

  const cannotEdit =
    job.status === "COMPLETED" || job.status === "CANCELED" || Boolean(job.activeCreatorId);

  if (cannotEdit) {
    return (
      <Container size="sm" className="py-10 space-y-4">
        <Link className="text-sm text-muted-foreground hover:text-foreground" href={`/jobs/${job.id}`}>
          ← Вернуться к заказу
        </Link>
        <Alert variant="warning" title="Редактирование недоступно">
          Нельзя менять заказ после выбора исполнителя или завершения сделки.
        </Alert>
      </Container>
    );
  }

  const initialValues = {
    ...job,
    description: job.description ?? "",
    notes: job.notes ?? "",
    deadlineDate: job.deadlineDate ? job.deadlineDate.toISOString() : undefined,
    usageTermDays: job.usageTermDays ?? undefined,
    musicPolicy: job.musicPolicy ?? undefined,
    brief: job.brief ?? {},
  };

  return (
    <Container size="md" className="py-10 space-y-6">
      <PageHeader
        title="Редактировать заказ"
        description="Изменения сохранятся и могут отправить заказ на повторную модерацию."
        eyebrow={
          <Link className="hover:text-foreground" href={`/jobs/${job.id}`}>
            Назад к заказу
          </Link>
        }
      />
      <Card>

        <CardContent>
          <JobCreateWizard
            mode="edit"
            jobId={job.id}
            initialValues={initialValues}
            hideDraftButton
            onSuccessRedirect={`/jobs/${job.id}`}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
