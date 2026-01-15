import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { Currency } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/alert";
import { CreatorProfileForm } from "@/components/creator/profile-form";
import { BrandProfileForm } from "@/components/brand/profile-form";
import { getBrandCompleteness, getCreatorCompleteness } from "@/lib/profiles/completeness";
import { TelegramBindingCard } from "@/components/telegram/telegram-binding-card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

type MissingItem = { key: string; label: string; ctaHref?: string };

function CompletenessCard({
  title,
  description,
  percent,
  missing,
}: {
  title: string;
  description: string;
  percent: number;
  missing: MissingItem[];
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-medium text-foreground">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/40">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      {missing.length === 0 ? (
        <Alert variant="success" title="Профиль готов">
          Можно выполнять ключевые действия в маркетплейсе.
        </Alert>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Нужно заполнить:</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((item) => (
              <Link
                key={item.key}
                href={item.ctaHref ?? "/dashboard/profile"}
                className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground transition hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function CreatorProfilePage() {
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

  if (user.role !== "CREATOR" && user.role !== "BRAND") {
    return (
      <Container size="sm" className="py-10">
        <Alert variant="warning" title="Только для брендов и креаторов">
          Эта страница доступна только аккаунтам креаторов и брендов.
        </Alert>
      </Container>
    );
  }

  const telegramAccount = await prisma.telegramAccount.findUnique({
    where: { userId: user.id },
    select: { telegramUserId: true, telegramUsername: true },
  });
  const telegramRequest = await prisma.telegramBindingRequest.findFirst({
    where: { userId: user.id, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { expiresAt: true },
  });
  const pendingTelegramRequest = telegramRequest
    ? { expiresAt: telegramRequest.expiresAt.toISOString() }
    : null;

  if (user.role === "BRAND") {
    const profile = await prisma.brandProfile.findUnique({
      where: { userId: user.id },
    });

    const initialProfile = {
      companyName: profile?.companyName ?? user.name ?? "",
      website: profile?.website ?? "",
      description: profile?.description ?? "",
    };
    const completeness = getBrandCompleteness(initialProfile);

    return (
      <Container size="md" className="py-10 space-y-6">
        <PageHeader
          title="Профиль бренда"
          description="Заполните информацию о компании, чтобы креаторы понимали ваш контекст."
          eyebrow={
            <Link className="hover:text-foreground" href="/dashboard">
              ← В кабинет
            </Link>
          }
        />

        <CompletenessCard
          title="Заполненность профиля бренда"
          description="Это влияет на возможность публиковать заказы и приглашать креаторов."
          percent={completeness.percent}
          missing={completeness.missing}
        />

        <TelegramBindingCard account={telegramAccount} pendingRequest={pendingTelegramRequest} />

        <BrandProfileForm initialProfile={initialProfile} />
      </Container>
    );
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    include: { portfolioItems: { select: { url: true } } },
  });

  const portfolioLinks = Array.from(
    new Set((profile?.portfolioItems ?? []).map((item) => item.url).filter(Boolean)),
  );

  const initialProfile = {
    displayName: user.name ?? "",
    bio: profile?.bio ?? "",
    languages: profile?.languages ?? [],
    platforms: profile?.platforms ?? [],
    niches: profile?.niches ?? [],
    pricePerVideo: profile?.pricePerVideo ?? null,
    currency: profile?.currency ?? Currency.RUB,
    portfolioLinks,
    isPublic: profile?.isPublic ?? false,
    verificationCode: profile?.verificationCode ?? null,
    verificationStatus: profile?.verificationStatus ?? "UNVERIFIED",
    verifiedAt: profile?.verifiedAt ?? null,
    verificationReason: profile?.verificationReason ?? null,
    verificationReviewedAt: profile?.verificationReviewedAt ?? null,
  };
  const completeness = getCreatorCompleteness({
    displayName: initialProfile.displayName,
    bio: initialProfile.bio,
    platforms: initialProfile.platforms,
    portfolioLinks,
    pricePerVideo: initialProfile.pricePerVideo ?? null,
  });

  return (
    <Container size="md" className="py-10 space-y-6">
      <PageHeader
        title="Профиль креатора"
        description="Заполните информацию, чтобы брендам было проще выбрать вас."
        eyebrow={
          <Link className="hover:text-foreground" href="/dashboard">
            ← В кабинет
          </Link>
        }
      />

      <CompletenessCard
        title="Заполненность профиля креатора"
        description="Чем полнее профиль, тем выше шанс получить заказ."
        percent={completeness.percent}
        missing={completeness.missing}
      />

      <TelegramBindingCard account={telegramAccount} pendingRequest={pendingTelegramRequest} />

      <CreatorProfileForm initialProfile={initialProfile} />
    </Container>
  );
}
