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

export type CreatorCursor = {
  id: string;
  updatedAt: string;
  pricePerVideo?: number | null;
  ratingAvg?: number | null;
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

  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const existing =
      typeof where.pricePerVideo === "object" && where.pricePerVideo !== null ? where.pricePerVideo : {};
    where.pricePerVideo = { ...existing, not: null };
  }

  return where;
}

export function buildCreatorOrderBy(
  filters: CreatorListFilters,
): Prisma.CreatorProfileOrderByWithRelationInput[] {
  switch (filters.sort) {
    case "price_asc":
      return [{ pricePerVideo: "asc" }, { updatedAt: "desc" }, { id: "desc" }];
    case "price_desc":
      return [{ pricePerVideo: "desc" }, { updatedAt: "desc" }, { id: "desc" }];
    case "rating_desc":
      return [{ ratingAvg: "desc" }, { updatedAt: "desc" }, { id: "desc" }];
    case "recent":
    default:
      return [{ updatedAt: "desc" }, { id: "desc" }];
  }
}

export function buildCreatorCursorWhere(filters: CreatorListFilters, cursor: CreatorCursor | null) {
  if (!cursor) return null;
  const updatedAt = new Date(cursor.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;

  switch (filters.sort) {
    case "price_asc":
      return {
        OR: [
          { pricePerVideo: { gt: cursor.pricePerVideo ?? 0 } },
          { pricePerVideo: cursor.pricePerVideo ?? 0, updatedAt: { lt: updatedAt } },
          { pricePerVideo: cursor.pricePerVideo ?? 0, updatedAt, id: { lt: cursor.id } },
        ],
      };
    case "price_desc":
      return {
        OR: [
          { pricePerVideo: { lt: cursor.pricePerVideo ?? 0 } },
          { pricePerVideo: cursor.pricePerVideo ?? 0, updatedAt: { lt: updatedAt } },
          { pricePerVideo: cursor.pricePerVideo ?? 0, updatedAt, id: { lt: cursor.id } },
        ],
      };
    case "rating_desc":
      return {
        OR: [
          { ratingAvg: { lt: cursor.ratingAvg ?? 0 } },
          { ratingAvg: cursor.ratingAvg ?? 0, updatedAt: { lt: updatedAt } },
          { ratingAvg: cursor.ratingAvg ?? 0, updatedAt, id: { lt: cursor.id } },
        ],
      };
    case "recent":
    default:
      return {
        OR: [
          { updatedAt: { lt: updatedAt } },
          { updatedAt, id: { lt: cursor.id } },
        ],
      };
  }
}
