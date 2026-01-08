import {
  PrismaClient,
  Role,
  Platform,
  Niche,
  Currency,
  RightsPackage,
  DeadlineType,
  JobStatus,
  ApplicationStatus,
  ContentFormat,
  ModerationStatus,
  MusicPolicy,
  VerificationStatus,
  EscrowStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("?? Seeding database...");

  const demoPassword = "password123";
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const commissionBpsEnv = Number.parseInt(process.env.COMMISSION_BPS ?? "", 10);
  const commissionBps = Number.isFinite(commissionBpsEnv) && commissionBpsEnv >= 0 ? commissionBpsEnv : 1500;

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Admin",
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const brand = await prisma.user.upsert({
    where: { email: "brand@example.com" },
    update: {
      name: "Demo Brand",
      passwordHash,
      role: Role.BRAND,
      brandProfile: {
        upsert: {
          update: {
            companyName: "Demo Brand",
            niche: Niche.FOOD,
            country: "RU",
            city: "Moscow",
            isVerified: true,
          },
          create: {
            companyName: "Demo Brand",
            niche: Niche.FOOD,
            country: "RU",
            city: "Moscow",
            isVerified: true,
          },
        },
      },
    },
    create: {
      email: "brand@example.com",
      name: "Demo Brand",
      passwordHash,
      role: Role.BRAND,
      brandProfile: {
        create: {
          companyName: "Demo Brand",
          niche: Niche.FOOD,
          country: "RU",
          city: "Moscow",
          isVerified: true,
        },
      },
    },
    include: { brandProfile: true },
  });

  const creator = await prisma.user.upsert({
    where: { email: "creator@example.com" },
    update: {
      name: "Demo Creator",
      passwordHash,
      role: Role.CREATOR,
      creatorProfile: {
        upsert: {
          update: {
            bio: "Снимаю UGC и обзоры. Люблю еду и приложения.",
            country: "RU",
            city: "Moscow",
            languages: ["ru", "en"],
            niches: [Niche.FOOD, Niche.APPS],
            platforms: [Platform.TIKTOK, Platform.INSTAGRAM_REELS],
            pricePerVideo: 1800,
            currency: Currency.RUB,
            isVerified: true,
            verificationStatus: VerificationStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationReviewedAt: new Date(),
            verificationReviewedByUserId: admin.id,
            ratingAvg: 4.7,
            isPublic: true,
          },
          create: {
            bio: "Снимаю UGC и обзоры. Люблю еду и приложения.",
            country: "RU",
            city: "Moscow",
            languages: ["ru", "en"],
            niches: [Niche.FOOD, Niche.APPS],
            platforms: [Platform.TIKTOK, Platform.INSTAGRAM_REELS],
            pricePerVideo: 1800,
            currency: Currency.RUB,
            isVerified: true,
            verificationStatus: VerificationStatus.VERIFIED,
            verifiedAt: new Date(),
            verificationReviewedAt: new Date(),
            verificationReviewedByUserId: admin.id,
            ratingAvg: 4.7,
            isPublic: true,
          },
        },
      },
    },
    create: {
      email: "creator@example.com",
      name: "Demo Creator",
      passwordHash,
      role: Role.CREATOR,
      creatorProfile: {
        create: {
          bio: "Снимаю UGC и обзоры. Люблю еду и приложения.",
          country: "RU",
          city: "Moscow",
          languages: ["ru", "en"],
          niches: [Niche.FOOD, Niche.APPS],
          platforms: [Platform.TIKTOK, Platform.INSTAGRAM_REELS],
          pricePerVideo: 1800,
          currency: Currency.RUB,
          isVerified: true,
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          verificationReviewedAt: new Date(),
          verificationReviewedByUserId: admin.id,
          ratingAvg: 4.7,
          isPublic: true,
        },
      },
    },
    include: { creatorProfile: true },
  });

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { commissionBps },
    create: { id: "singleton", commissionBps, defaultCurrency: Currency.RUB },
  });

  await Promise.all([
    prisma.wallet.upsert({
      where: { userId: brand.id },
      update: { currency: Currency.RUB },
      create: { userId: brand.id, currency: Currency.RUB, balanceCents: 0 },
    }),
    prisma.wallet.upsert({
      where: { userId: creator.id },
      update: { currency: creator.creatorProfile?.currency ?? Currency.RUB },
      create: {
        userId: creator.id,
        currency: creator.creatorProfile?.currency ?? Currency.RUB,
        balanceCents: 0,
      },
    }),
    prisma.wallet.upsert({
      where: { userId: admin.id },
      update: { currency: Currency.RUB },
      create: { userId: admin.id, currency: Currency.RUB, balanceCents: 0 },
    }),
  ]);

  if (creator.creatorProfile) {
    await prisma.portfolioItem.deleteMany({
      where: { creatorId: creator.creatorProfile.id },
    });
    await prisma.portfolioItem.createMany({
      data: [
        {
          creatorId: creator.creatorProfile.id,
          title: "Пример обзора (TikTok)",
          kind: "LINK",
          platform: Platform.TIKTOK,
          url: "https://www.tiktok.com/@example/video/0000000000000000000",
        },
        {
          creatorId: creator.creatorProfile.id,
          title: "Пример Reels (еда)",
          kind: "LINK",
          platform: Platform.INSTAGRAM_REELS,
          url: "https://www.instagram.com/reel/XXXXXXXXXXX/",
        },
      ],
    });
  }

  await prisma.job.deleteMany({
    where: { brandId: brand.id, title: { startsWith: "[DEMO]" } },
  });

  const publishedJob = await prisma.job.create({
    data: {
      brandId: brand.id,
      title: "[DEMO] 8 UGC-роликов для десерта",
      description:
        "Нужно 8 коротких роликов (15-20 сек) в формате отзыв + 'как готовить'. Без публикации, только файлы. Язык: RU.",
      platform: Platform.TIKTOK,
      niche: Niche.FOOD,
      deliverablesCount: 8,
      videoDurationSec: 20,
      contentFormats: ["REVIEW", "HOW_TO"] as ContentFormat[],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: RightsPackage.ADS,
      usageTermDays: 90,
      revisionRounds: 2,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: true,
      deliverablesIncludeRaw: true,
      deliverablesIncludeProjectFile: true,
      subtitlesRequired: true,
      musicPolicy: MusicPolicy.BRAND_SAFE,
      scriptProvided: true,
      notes: "Снимаем на дневном свете, избегать брендов конкурентов. Прикладывать субтитры и исходники.",
      budgetMin: 10000,
      budgetMax: 18000,
      currency: Currency.RUB,
      deadlineType: DeadlineType.DATE,
      deadlineDate: daysFromNow(7),
      status: JobStatus.PUBLISHED,
      moderationStatus: ModerationStatus.APPROVED,
      moderatedAt: new Date(),
      moderatedByUserId: admin.id,
      brief: {
        product: "Авторский десертный микс",
        notes: "Снимать дома/в студии, дневной свет, без мата.",
      },
    },
  });

  const draftJob = await prisma.job.create({
    data: {
      brandId: brand.id,
      title: "[DEMO] 4 Reels про приложение (скринкасты)",
      description:
        "Тестовое задание: 4 вертикальных ролика с записью экрана и голосом. Показать ключевую фичу и результат.",
      platform: Platform.INSTAGRAM_REELS,
      niche: Niche.APPS,
      deliverablesCount: 4,
      videoDurationSec: 25,
      contentFormats: ["SCREEN_RECORDING", "VOICE_OVER"] as ContentFormat[],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: RightsPackage.BASIC,
      usageTermDays: 180,
      revisionRounds: 2,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: true,
      musicPolicy: MusicPolicy.BRAND_SAFE,
      scriptProvided: true,
      notes: "Покажите экран и основные фичи. Без личных данных.",
      budgetMin: 8000,
      budgetMax: 12000,
      currency: Currency.RUB,
      deadlineType: DeadlineType.DATE,
      deadlineDate: daysFromNow(14),
      status: JobStatus.DRAFT,
      brief: {
        app: "Планировщик задач",
        mustHave: ["субтитры", "показывать экран", "лайфхаки"],
      },
    },
  });

  await prisma.escrow.upsert({
    where: { jobId: publishedJob.id },
    update: { creatorId: null },
    create: {
      jobId: publishedJob.id,
      brandId: brand.id,
      creatorId: null,
      amountCents: publishedJob.budgetMax * 100,
      currency: publishedJob.currency,
      status: EscrowStatus.UNFUNDED,
    },
  });

  const completedJob = await prisma.job.create({
    data: {
      brandId: brand.id,
      activeCreatorId: creator.id,
      title: "[DEMO] Завершённый заказ на обзоры",
      description: "Заказ завершён, подходит для демонстрации отзывов.",
      platform: Platform.TIKTOK,
      niche: Niche.FOOD,
      deliverablesCount: 3,
      videoDurationSec: 20,
      contentFormats: ["REVIEW"] as ContentFormat[],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: RightsPackage.BASIC,
      usageTermDays: 90,
      revisionRounds: 1,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: false,
      musicPolicy: MusicPolicy.BRAND_SAFE,
      scriptProvided: true,
      notes: "Демо завершённый заказ.",
      budgetMin: 6000,
      budgetMax: 9000,
      currency: Currency.RUB,
      deadlineType: DeadlineType.DATE,
      deadlineDate: daysFromNow(-3),
      status: JobStatus.COMPLETED,
      moderationStatus: ModerationStatus.APPROVED,
      moderatedAt: new Date(),
      moderatedByUserId: admin.id,
      brief: {
        summary: "Демо бриф для отзывов.",
      },
    },
  });

  await prisma.job.create({
    data: {
      brandId: brand.id,
      title: "[DEMO] Отклонённый заказ (добавьте детали)",
      description: "Пример отклонённой заявки — добавьте больше деталей, чтобы пройти модерацию.",
      platform: Platform.TIKTOK,
      niche: Niche.OTHER,
      deliverablesCount: 2,
      videoDurationSec: 15,
      contentFormats: ["REVIEW"] as ContentFormat[],
      needsPosting: true,
      needsWhitelisting: false,
      rightsPackage: RightsPackage.BASIC,
      usageTermDays: 30,
      revisionRounds: 1,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: false,
      musicPolicy: MusicPolicy.BRAND_SAFE,
      scriptProvided: false,
      notes: "Добавьте чёткое ТЗ и примеры желаемых роликов перед повторной отправкой.",
      budgetMin: 3000,
      budgetMax: 5000,
      currency: Currency.RUB,
      deadlineType: DeadlineType.DATE,
      deadlineDate: daysFromNow(10),
      status: JobStatus.PUBLISHED,
      moderationStatus: ModerationStatus.REJECTED,
      moderationReason: "Недостаточно подробное описание и примеры контента.",
      moderatedAt: new Date(),
      moderatedByUserId: admin.id,
      brief: {
        hint: "Добавьте ссылку на пример ролика.",
      },
    },
  });

  await prisma.application.upsert({
    where: {
      jobId_creatorId: {
        jobId: publishedJob.id,
        creatorId: creator.id,
      },
    },
    update: {
      message: "Готов снять серию UGC-роликов и записать лайфхаки по приготовлению.",
      priceQuote: 15000,
      status: ApplicationStatus.PENDING,
    },
    create: {
      jobId: publishedJob.id,
      creatorId: creator.id,
      priceQuote: 15000,
      message: "Готов снять серию UGC-роликов и записать лайфхаки по приготовлению.",
      status: ApplicationStatus.PENDING,
    },
  });

  await prisma.review.upsert({
    where: {
      jobId_fromUserId: {
        jobId: completedJob.id,
        fromUserId: brand.id,
      },
    },
    update: {
      toUserId: creator.id,
      rating: 5,
      text: "Отличная работа, всё в срок и качественно!",
    },
    create: {
      jobId: completedJob.id,
      fromUserId: brand.id,
      toUserId: creator.id,
      rating: 5,
      text: "Отличная работа, всё в срок и качественно!",
    },
  });

  await prisma.review.upsert({
    where: {
      jobId_fromUserId: {
        jobId: completedJob.id,
        fromUserId: creator.id,
      },
    },
    update: {
      toUserId: brand.id,
      rating: 5,
      text: "Работать с брендом комфортно, четкий бриф и оплата вовремя.",
    },
    create: {
      jobId: completedJob.id,
      fromUserId: creator.id,
      toUserId: brand.id,
      rating: 5,
      text: "Работать с брендом комфортно, четкий бриф и оплата вовремя.",
    },
  });

  console.log("? Done.");
  console.log("?? Demo accounts:");
  console.log("   Brand:   brand@example.com / password123");
  console.log("   Creator: creator@example.com / password123");
  console.log("   Admin:   admin@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
