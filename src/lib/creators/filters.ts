import { Prisma, Platform, Niche, VerificationStatus } from "@prisma/client";

export type CreatorListFilters = {
  q?: string;
  platform?: Platform;
  niche?: Niche;
  lang?: string;
  verifiedOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort: "recent" | "price_asc" | "price_desc" | "rating_desc";
};

function parseNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseEnum<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function parseBool(value: string | null | undefined) {
  if (!value) return undefined;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

export function parseCreatorListFilters(
  searchParams: Record<string, string | string[] | undefined>,
): CreatorListFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const sort = get("sort");
  const verifiedOnly = parseBool(get("verifiedOnly"));

  return {
    q: get("q") ?? undefined,
    platform: parseEnum(get("platform"), Object.values(Platform)),
    niche: parseEnum(get("niche"), Object.values(Niche)),
    lang: get("lang") ?? undefined,
    verifiedOnly: verifiedOnly === undefined ? true : Boolean(verifiedOnly),
    minPrice: parseNumber(get("minPrice")),
    maxPrice: parseNumber(get("maxPrice")),
    sort: sort === "price_asc" || sort === "price_desc" || sort === "rating_desc" ? sort : "recent",
  };
}

export function buildCreatorWhere(
  filters: CreatorListFilters,
  forceVerified = false,
  forcePublic = false,
): Prisma.CreatorProfileWhereInput {
  const where: Prisma.CreatorProfileWhereInput = {};

  if (filters.verifiedOnly || forceVerified) {
    where.verificationStatus = VerificationStatus.VERIFIED;
  }

  if (forcePublic) {
    where.isPublic = true;
  }

  if (filters.q) {
    where.OR = [
      { user: { name: { contains: filters.q, mode: "insensitive" } } },
      { bio: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.platform) where.platforms = { has: filters.platform };
  if (filters.niche) where.niches = { has: filters.niche };
  if (filters.lang) where.languages = { has: filters.lang };

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.pricePerVideo = {};
    if (filters.minPrice !== undefined) where.pricePerVideo.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.pricePerVideo.lte = filters.maxPrice;
  }

  return where;
}

export function buildCreatorOrderBy(
  filters: CreatorListFilters,
): Prisma.CreatorProfileOrderByWithRelationInput[] {
  switch (filters.sort) {
    case "price_asc":
      return [{ pricePerVideo: "asc" }, { updatedAt: "desc" }];
    case "price_desc":
      return [{ pricePerVideo: "desc" }, { updatedAt: "desc" }];
    case "rating_desc":
      return [{ ratingAvg: "desc" }, { updatedAt: "desc" }];
    case "recent":
    default:
      return [{ updatedAt: "desc" }];
  }
}
