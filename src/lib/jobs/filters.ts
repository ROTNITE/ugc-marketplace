import type {
  Prisma,
  Platform,
  Niche,
  Currency,
  ContentFormat,
  RightsPackage,
  JobStatus,
  ModerationStatus,
} from "@prisma/client";

export type JobSort = "new" | "budget";

export type JobCursor = {
  id: string;
  createdAt: string;
  budgetMax?: number;
};

export interface JobListFilters {
  q?: string;
  platform?: Platform;
  niche?: Niche;
  currency?: Currency;
  minBudget?: number;
  maxBudget?: number;
  minDeliverables?: number;
  maxDeliverables?: number;
  minDurationSec?: number;
  maxDurationSec?: number;
  formats?: ContentFormat[];
  rightsPackage?: RightsPackage;
  needsPosting?: boolean;
  needsWhitelisting?: boolean;
  shippingRequired?: boolean;
  lang?: string;
  sort?: JobSort;
  status?: JobStatus;
  moderationStatus?: ModerationStatus;
}

function parseEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase()) ? true : undefined;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parseJobListFilters(
  searchParams: Record<string, string | string[] | undefined>,
): JobListFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0];
    return value ?? undefined;
  };

  const q = get("q")?.trim();
  const platform = parseEnum(get("platform"), ["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS", "VK_CLIPS", "OTHER"]);
  const niche = parseEnum(get("niche"), [
    "BEAUTY",
    "FOOD",
    "FITNESS",
    "GADGETS",
    "GAMES",
    "EDUCATION",
    "FINTECH",
    "APPS",
    "ECOMMERCE",
    "HOME",
    "KIDS",
    "PETS",
    "TRAVEL",
    "OTHER",
  ]);
  const currency = parseEnum(get("currency"), ["RUB", "KZT", "UAH", "BYN", "USD", "EUR"]);
  const rightsPackage = parseEnum(get("rightsPackage"), ["BASIC", "ADS", "SPARK_PARTNERSHIP", "BUYOUT"]);
  const sort = parseEnum(get("sort"), ["new", "budget"]);

  const minBudget = parseNumber(get("minBudget"));
  const maxBudget = parseNumber(get("maxBudget"));
  const minDeliverables = parseNumber(get("minDeliverables"));
  const maxDeliverables = parseNumber(get("maxDeliverables"));
  const minDurationSec = parseNumber(get("minDurationSec"));
  const maxDurationSec = parseNumber(get("maxDurationSec"));

  const formatsRaw = get("formats");
  const formatsList = formatsRaw ? parseList(formatsRaw) : [];
  const formats = formatsList.filter((f) =>
    ["REVIEW", "UNBOXING", "HOW_TO", "BEFORE_AFTER", "TESTIMONIAL", "SKETCH", "SCREEN_RECORDING", "VOICE_OVER", "TALKING_HEAD", "NO_FACE", "OTHER"].includes(f),
  ) as ContentFormat[];

  const needsPosting = parseBoolean(get("needsPosting"));
  const needsWhitelisting = parseBoolean(get("needsWhitelisting"));
  const shippingRequired = parseBoolean(get("shippingRequired"));
  const lang = get("lang")?.trim().toLowerCase() || undefined;

  return {
    q,
    platform,
    niche,
    currency,
    minBudget,
    maxBudget,
    minDeliverables,
    maxDeliverables,
    minDurationSec,
    maxDurationSec,
    formats: formats.length ? formats : undefined,
    rightsPackage,
    needsPosting,
    needsWhitelisting,
    shippingRequired,
    lang,
    sort: sort ?? "new",
    status: "PUBLISHED",
    moderationStatus: "APPROVED",
  };
}

export function buildJobWhere(filters: JobListFilters): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {
    status: filters.status ?? "PUBLISHED",
  };

  if (filters.moderationStatus) {
    where.moderationStatus = filters.moderationStatus;
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.platform) where.platform = filters.platform;
  if (filters.niche) where.niche = filters.niche;
  if (filters.currency) where.currency = filters.currency;
  if (filters.minBudget !== undefined) where.budgetMax = { gte: filters.minBudget };
  if (filters.maxBudget !== undefined) where.budgetMin = { lte: filters.maxBudget };
  if (filters.minDeliverables !== undefined)
    where.deliverablesCount = { ...(where.deliverablesCount as object), gte: filters.minDeliverables };
  if (filters.maxDeliverables !== undefined)
    where.deliverablesCount = { ...(where.deliverablesCount as object), lte: filters.maxDeliverables };
  if (filters.minDurationSec !== undefined)
    where.videoDurationSec = { ...(where.videoDurationSec as object), gte: filters.minDurationSec };
  if (filters.maxDurationSec !== undefined)
    where.videoDurationSec = { ...(where.videoDurationSec as object), lte: filters.maxDurationSec };
  if (filters.formats?.length) where.contentFormats = { hasSome: filters.formats };
  if (filters.rightsPackage) where.rightsPackage = filters.rightsPackage;
  if (filters.needsPosting) where.needsPosting = true;
  if (filters.needsWhitelisting) where.needsWhitelisting = true;
  if (filters.shippingRequired) where.shippingRequired = true;
  if (filters.lang) where.languages = { has: filters.lang };

  return where;
}

export function buildJobOrderBy(
  filters: JobListFilters,
): Prisma.JobOrderByWithRelationInput[] {
  if (filters.sort === "budget") {
    return [{ budgetMax: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  }

  return [{ createdAt: "desc" }, { id: "desc" }];
}

export function buildJobCursorWhere(filters: JobListFilters, cursor: JobCursor | null) {
  if (!cursor) return null;
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  if (filters.sort === "budget" && typeof cursor.budgetMax === "number") {
    return {
      OR: [
        { budgetMax: { lt: cursor.budgetMax } },
        { budgetMax: cursor.budgetMax, createdAt: { lt: createdAt } },
        { budgetMax: cursor.budgetMax, createdAt, id: { lt: cursor.id } },
      ],
    };
  }

  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { createdAt, id: { lt: cursor.id } },
    ],
  };
}
