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
const seedNow = new Date("2025-01-15T12:00:00.000Z");
const E2E_JOB_ID = "00000000-0000-4000-8000-000000000001";
const FOREIGN_E2E_JOB_ID = "00000000-0000-4000-8000-000000000002";

function daysFrom(base: Date, days: number) {
  const d = new Date(base);
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
            website: "https://example.com",
            description: "Бренд для демонстрации сценариев UGC-рынка.",
            niche: Niche.FOOD,
            country: "RU",
            city: "Moscow",
            isVerified: true,
          },
          create: {
            companyName: "Demo Brand",
            website: "https://example.com",
            description: "Бренд для демонстрации сценариев UGC-рынка.",
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
          website: "https://example.com",
          description: "Бренд для демонстрации сценариев UGC-рынка.",
          niche: Niche.FOOD,
          country: "RU",
          city: "Moscow",
          isVerified: true,
        },
      },
    },
    include: { brandProfile: true },
  });

  const brandB = await prisma.user.upsert({
    where: { email: "brand-b@example.com" },
    update: {
      name: "Brand B",
      passwordHash,
      role: Role.BRAND,
      brandProfile: {
        upsert: {
          update: {
            companyName: "Brand B",
            website: "https://brand-b.example.com",
            description: "Второй бренд для негативных сценариев.",
            niche: Niche.APPS,
            country: "RU",
            city: "Kazan",
            isVerified: false,
          },
          create: {
            companyName: "Brand B",
            website: "https://brand-b.example.com",
            description: "Второй бренд для негативных сценариев.",
            niche: Niche.APPS,
            country: "RU",
            city: "Kazan",
            isVerified: false,
          },
        },
      },
    },
    create: {
      email: "brand-b@example.com",
      name: "Brand B",
      passwordHash,
      role: Role.BRAND,
      brandProfile: {
        create: {
          companyName: "Brand B",
          website: "https://brand-b.example.com",
          description: "Второй бренд для негативных сценариев.",
          niche: Niche.APPS,
          country: "RU",
          city: "Kazan",
          isVerified: false,
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
            verifiedAt: seedNow,
            verificationReviewedAt: seedNow,
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
            verifiedAt: seedNow,
            verificationReviewedAt: seedNow,
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
          verifiedAt: seedNow,
          verificationReviewedAt: seedNow,
          verificationReviewedByUserId: admin.id,
          ratingAvg: 4.7,
          isPublic: true,
        },
      },
    },
    include: { creatorProfile: true },
  });

  const creatorB = await prisma.user.upsert({
    where: { email: "creator-b@example.com" },
    update: {
      name: "Creator B",
      passwordHash,
      role: Role.CREATOR,
      creatorProfile: {
        upsert: {
          update: {
            bio: "Креатор для проверок чужих ролей.",
            country: "RU",
            city: "Perm",
            languages: ["ru"],
            niches: [Niche.APPS],
            platforms: [Platform.TIKTOK],
            pricePerVideo: 1200,
            currency: Currency.RUB,
            isVerified: false,
            verificationStatus: VerificationStatus.UNVERIFIED,
            isPublic: true,
          },
          create: {
            bio: "Креатор для проверок чужих ролей.",
            country: "RU",
            city: "Perm",
            languages: ["ru"],
            niches: [Niche.APPS],
            platforms: [Platform.TIKTOK],
            pricePerVideo: 1200,
            currency: Currency.RUB,
            isVerified: false,
            verificationStatus: VerificationStatus.UNVERIFIED,
            isPublic: true,
          },
        },
      },
    },
    create: {
      email: "creator-b@example.com",
      name: "Creator B",
      passwordHash,
      role: Role.CREATOR,
      creatorProfile: {
        create: {
          bio: "Креатор для проверок чужих ролей.",
          country: "RU",
          city: "Perm",
          languages: ["ru"],
          niches: [Niche.APPS],
          platforms: [Platform.TIKTOK],
          pricePerVideo: 1200,
          currency: Currency.RUB,
          isVerified: false,
          verificationStatus: VerificationStatus.UNVERIFIED,
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
      where: { userId: brandB.id },
      update: { currency: Currency.RUB },
      create: { userId: brandB.id, currency: Currency.RUB, balanceCents: 0 },
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
      where: { userId: creatorB.id },
      update: { currency: creatorB.creatorProfile?.currency ?? Currency.RUB },
      create: {
        userId: creatorB.id,
        currency: creatorB.creatorProfile?.currency ?? Currency.RUB,
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
    where: { title: { startsWith: "[DEMO]" } },
  });
  await prisma.job.deleteMany({
    where: { title: { startsWith: "[E2E]" } },
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
      deadlineDate: daysFrom(seedNow, 7),
      status: JobStatus.PUBLISHED,
      moderationStatus: ModerationStatus.APPROVED,
      moderatedAt: seedNow,
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
      deadlineDate: daysFrom(seedNow, 14),
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
      deadlineDate: daysFrom(seedNow, -3),
      status: JobStatus.COMPLETED,
      moderationStatus: ModerationStatus.APPROVED,
      moderatedAt: seedNow,
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
      deadlineDate: daysFrom(seedNow, 10),
      status: JobStatus.PUBLISHED,
      moderationStatus: ModerationStatus.REJECTED,
      moderationReason: "Недостаточно подробное описание и примеры контента.",
      moderatedAt: seedNow,
      moderatedByUserId: admin.id,
      brief: {
        hint: "Добавьте ссылку на пример ролика.",
      },
    },
  });

  await prisma.job.deleteMany({
    where: {
      brandId: brand.id,
      title: "[E2E] Job for full flow",
      id: { not: E2E_JOB_ID },
    },
  });

  const e2eJobData = {
    brandId: brand.id,
    title: "[E2E] Job for full flow",
    description: "Эталонный заказ для E2E smoke (apply/accept/fund/submit/approve).",
    platform: Platform.TIKTOK,
    niche: Niche.FOOD,
    deliverablesCount: 1,
    videoDurationSec: 20,
    contentFormats: ["REVIEW"] as ContentFormat[],
    needsPosting: false,
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
    scriptProvided: true,
    notes: "Smoke flow job.",
    budgetMin: 4000,
    budgetMax: 6000,
    currency: Currency.RUB,
    deadlineType: DeadlineType.DATE,
    deadlineDate: daysFrom(seedNow, 5),
    status: JobStatus.PUBLISHED,
    moderationStatus: ModerationStatus.APPROVED,
    moderatedAt: seedNow,
    moderatedByUserId: admin.id,
    activeCreatorId: null,
    brief: { source: "smoke" },
  };

  await prisma.job.upsert({
    where: { id: E2E_JOB_ID },
    update: e2eJobData,
    create: {
      id: E2E_JOB_ID,
      ...e2eJobData,
    },
  });

  await prisma.escrow.deleteMany({
    where: { jobId: E2E_JOB_ID },
  });

  await prisma.job.deleteMany({
    where: {
      brandId: brandB.id,
      title: "[E2E] Foreign job for negative checks",
      id: { not: FOREIGN_E2E_JOB_ID },
    },
  });

  const foreignJobData = {
    brandId: brandB.id,
    title: "[E2E] Foreign job for negative checks",
    description: "Чужой заказ для негативных проверок.",
    platform: Platform.TIKTOK,
    niche: Niche.APPS,
    deliverablesCount: 1,
    videoDurationSec: 15,
    contentFormats: ["REVIEW"] as ContentFormat[],
    needsPosting: false,
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
    notes: "Foreign job for authz checks.",
    budgetMin: 3000,
    budgetMax: 5000,
    currency: Currency.RUB,
    deadlineType: DeadlineType.DATE,
    deadlineDate: daysFrom(seedNow, 6),
    status: JobStatus.PUBLISHED,
    moderationStatus: ModerationStatus.APPROVED,
    moderatedAt: seedNow,
    moderatedByUserId: admin.id,
    activeCreatorId: null,
    brief: { source: "smoke-foreign" },
  };

  await prisma.job.upsert({
    where: { id: FOREIGN_E2E_JOB_ID },
    update: foreignJobData,
    create: {
      id: FOREIGN_E2E_JOB_ID,
      ...foreignJobData,
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
  console.log("   Brand B: brand-b@example.com / password123");
  console.log("   Creator: creator@example.com / password123");
  console.log("   Creator B: creator-b@example.com / password123");
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
