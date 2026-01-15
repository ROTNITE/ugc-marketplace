import { ContentFormat, Currency, Niche, Platform, RightsPackage } from "@prisma/client";

export const PLATFORM_LABELS: Record<Platform, string> = {
  TIKTOK: "TikTok",
  INSTAGRAM_REELS: "Instagram Reels",
  YOUTUBE_SHORTS: "YouTube Shorts",
  VK_CLIPS: "VK Клипы",
  OTHER: "Другое",
};

export const NICHE_LABELS: Record<Niche, string> = {
  BEAUTY: "Красота",
  FOOD: "Еда",
  FITNESS: "Фитнес",
  GADGETS: "Гаджеты",
  GAMES: "Игры",
  EDUCATION: "Обучение",
  FINTECH: "Финтех",
  APPS: "Приложения",
  ECOMMERCE: "E-commerce",
  HOME: "Дом/товары",
  KIDS: "Дети",
  PETS: "Питомцы",
  TRAVEL: "Путешествия",
  OTHER: "Другое",
};

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  REVIEW: "Отзыв/обзор",
  UNBOXING: "Распаковка",
  HOW_TO: "Как пользоваться",
  BEFORE_AFTER: "До/после",
  TESTIMONIAL: "Тестимониал",
  SKETCH: "Скетч/юмор",
  SCREEN_RECORDING: "Запись экрана",
  VOICE_OVER: "Voice-over",
  TALKING_HEAD: "Talking head",
  NO_FACE: "Без лица",
  OTHER: "Другое",
};

export const RIGHTS_PACKAGE_LABELS: Record<RightsPackage, string> = {
  BASIC: "Basic (органик)",
  ADS: "Ads (можно в рекламу)",
  SPARK_PARTNERSHIP: "Spark/Partnership (пост у креатора)",
  BUYOUT: "Buyout (полный выкуп)",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  RUB: "₽ RUB",
  KZT: "₸ KZT",
  UAH: "₴ UAH",
  BYN: "Br BYN",
  USD: "$ USD",
  EUR: "€ EUR",
};

export const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];
export const NICHES = Object.keys(NICHE_LABELS) as Niche[];
export const CONTENT_FORMATS = Object.keys(CONTENT_FORMAT_LABELS) as ContentFormat[];
export const RIGHTS_PACKAGES = Object.keys(RIGHTS_PACKAGE_LABELS) as RightsPackage[];
export const CURRENCIES = Object.keys(CURRENCY_LABELS) as Currency[];
