type MissingItem = {
  key: string;
  label: string;
  ctaHref?: string;
};

type CompletenessResult = {
  percent: number;
  missing: MissingItem[];
};

type CreatorCompletenessInput = {
  displayName?: string | null;
  bio?: string | null;
  platforms?: string[] | null;
  portfolioLinks?: string[] | null;
  pricePerVideo?: number | null;
};

type BrandCompletenessInput = {
  companyName?: string | null;
  website?: string | null;
  description?: string | null;
};

function calcPercent(total: number, missing: number) {
  if (total <= 0) return 0;
  return Math.round(((total - missing) / total) * 100);
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getCreatorCompleteness(input: CreatorCompletenessInput): CompletenessResult {
  const displayName = input.displayName?.trim() ?? "";
  const bio = input.bio?.trim() ?? "";
  const platforms = input.platforms ?? [];
  const portfolioLinks = input.portfolioLinks ?? [];
  const pricePerVideo = input.pricePerVideo ?? null;

  const checks: Array<{ item: MissingItem; ok: boolean }> = [
    {
      item: { key: "displayName", label: "Имя", ctaHref: "#creator-display-name" },
      ok: displayName.length >= 2,
    },
    {
      item: { key: "bio", label: "Био (минимум 20 символов)", ctaHref: "#creator-bio" },
      ok: bio.length >= 20,
    },
    {
      item: { key: "platforms", label: "Платформы", ctaHref: "#creator-platforms" },
      ok: platforms.length > 0,
    },
    {
      item: { key: "portfolio", label: "Ссылка на портфолио", ctaHref: "#creator-portfolio" },
      ok: portfolioLinks.length > 0,
    },
    {
      item: { key: "price", label: "Ставка за видео", ctaHref: "#creator-price" },
      ok: typeof pricePerVideo === "number" && pricePerVideo > 0,
    },
  ];

  const missing = checks.filter((check) => !check.ok).map((check) => check.item);
  return { percent: calcPercent(checks.length, missing.length), missing };
}

export function isCreatorProfileReady(input: CreatorCompletenessInput): boolean {
  return getCreatorCompleteness(input).missing.length === 0;
}

export function getBrandCompleteness(input: BrandCompletenessInput): CompletenessResult {
  const companyName = input.companyName?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const website = input.website?.trim() ?? "";
  const websiteOk = !website || isValidUrl(website);

  const checks: Array<{ item: MissingItem; ok: boolean; optional?: boolean }> = [
    {
      item: { key: "companyName", label: "Название компании", ctaHref: "#brand-company" },
      ok: companyName.length >= 2,
    },
    {
      item: { key: "description", label: "Описание (минимум 20 символов)", ctaHref: "#brand-description" },
      ok: description.length >= 20,
    },
    {
      item: { key: "website", label: "Сайт (валидный URL)", ctaHref: "#brand-website" },
      ok: websiteOk,
      optional: true,
    },
  ];

  const missing = checks
    .filter((check) => !check.ok && (!check.optional || website.length > 0))
    .map((check) => check.item);
  return { percent: calcPercent(checks.length, missing.length), missing };
}

export function isBrandProfileReady(input: BrandCompletenessInput): boolean {
  return getBrandCompleteness(input).missing.length === 0;
}

export type { MissingItem, CompletenessResult };
