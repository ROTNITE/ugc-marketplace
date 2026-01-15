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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="info" title="Нужен вход">
          Перейдите на страницу входа.
        </Alert>
      </div>
    );
  }

  if (user.role !== "CREATOR" && user.role !== "BRAND") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert variant="warning" title="Только для брендов и креаторов">
          Эта страница доступна только аккаунтам креаторов и брендов.
        </Alert>
      </div>
    );
  }

  const telegramAccount = await prisma.telegramAccount.findUnique({
    where: { userId: user.id },
    select: { telegramUserId: true, telegramUsername: true },
  });

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
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard">
            ← В кабинет
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Профиль бренда</h1>
          <p className="text-sm text-muted-foreground">
            Заполните информацию о компании, чтобы креаторы понимали ваш контекст.
          </p>
        </div>

        <CompletenessCard
          title="Заполненность профиля бренда"
          description="Это влияет на возможность публиковать заказы и приглашать креаторов."
          percent={completeness.percent}
          missing={completeness.missing}
        />

        <TelegramBindingCard account={telegramAccount} />

        <BrandProfileForm initialProfile={initialProfile} />
      </div>
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
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div>
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard">
          ← В кабинет
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль креатора</h1>
        <p className="text-sm text-muted-foreground">
          Заполните информацию, чтобы брендам было проще выбрать вас.
        </p>
      </div>

      <CompletenessCard
        title="Заполненность профиля креатора"
        description="Чем полнее профиль, тем выше шанс получить заказ."
        percent={completeness.percent}
        missing={completeness.missing}
      />

      <TelegramBindingCard account={telegramAccount} />

      <CreatorProfileForm initialProfile={initialProfile} />
    </div>
  );
}
