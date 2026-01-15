import { z } from "zod";
import {
  ContentFormat,
  Currency,
  DeadlineType,
  JobStatus,
  MusicPolicy,
  Niche,
  Platform,
  RightsPackage,
} from "@prisma/client";

export const registerSchema = z.object({
  name: z.string().min(2).max(80).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["CREATOR", "BRAND"]),
  companyName: z.string().min(2).max(120).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const jobCreateSchemaBase = z.object({
  title: z.string().min(8).max(140),
  description: z.string().max(5000).optional().or(z.literal("")),
  platform: z.nativeEnum(Platform),
  niche: z.nativeEnum(Niche),

  deliverablesCount: z.number().int().min(1).max(200).default(1),
  videoDurationSec: z.number().int().min(5).max(180).default(15),
  contentFormats: z.array(z.nativeEnum(ContentFormat)).default([]),

  needsPosting: z.boolean().default(false),
  needsWhitelisting: z.boolean().default(false),

  rightsPackage: z.nativeEnum(RightsPackage).default(RightsPackage.BASIC),
  usageTermDays: z.number().int().min(7).max(3650),
  revisionRounds: z.number().int().min(0).max(10).default(1),
  revisionRoundsIncluded: z.number().int().min(0).max(2),

  languages: z.array(z.string().min(2).max(10)).default(["ru"]),
  shippingRequired: z.boolean().default(false),
  deliverablesIncludeRaw: z.boolean().default(false),
  deliverablesIncludeProjectFile: z.boolean().default(false),
  subtitlesRequired: z.boolean().default(false),
  musicPolicy: z.nativeEnum(MusicPolicy).optional(),
  scriptProvided: z.boolean().default(false),
  notes: z.string().max(1500).optional().or(z.literal("")),

  budgetMin: z.number().int().min(1),
  budgetMax: z.number().int().min(1),
  currency: z.nativeEnum(Currency).default(Currency.RUB),

  deadlineType: z.nativeEnum(DeadlineType),
  deadlineDate: z.string().datetime().optional(),

  // Any extra fields for future can go here
  brief: z.any().optional(),
  status: z.nativeEnum(JobStatus).optional(),
});

export const jobCreateSchema = jobCreateSchemaBase.refine(
  (v: z.infer<typeof jobCreateSchemaBase>) => v.budgetMax >= v.budgetMin,
  {
  message: "budgetMax must be >= budgetMin",
  path: ["budgetMax"],
  },
).refine((v) => {
  if (v.deadlineType !== "DATE") return true;
  if (!v.deadlineDate) return false;
  const date = new Date(v.deadlineDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}, {
  message: "Укажите дату дедлайна не раньше сегодняшнего дня",
  path: ["deadlineDate"],
});

export const jobApplySchema = z.object({
  message: z.string().max(2000).optional().or(z.literal("")),
  priceQuote: z.number().int().min(1).optional(),
});

export const creatorProfileSchema = z.object({
  displayName: z.string().min(2).max(80).optional().or(z.literal("")),
  bio: z.string().max(600).optional().or(z.literal("")),
  languages: z.array(z.enum(["ru", "uk", "en"])).default([]),
  platforms: z.array(z.nativeEnum(Platform)).default([]),
  niches: z.array(z.nativeEnum(Niche)).default([]),
  pricePerVideo: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    },
    z.number().int().min(1).max(1_000_000).optional(),
  ),
  currency: z.nativeEnum(Currency).default(Currency.RUB),
  portfolioLinks: z.array(z.string().url()).max(10).default([]),
  isPublic: z.boolean().default(false),
});

export const brandProfileSchema = z.object({
  companyName: z.string().min(2).max(120),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
});

const submissionItemSchema = z.object({
  type: z.enum(["FINAL_VIDEO", "RAW_FILES", "PROJECT_FILE", "OTHER"]),
  url: z.string().trim().url("Укажите корректную ссылку."),
});

export const submissionSchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(submissionItemSchema).min(1, "Добавьте хотя бы одну ссылку."),
});
