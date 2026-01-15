import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Platform, Niche } from "@prisma/client";

const schema = z
  .object({
    name: z.string().min(2).max(80),
    platform: z.nativeEnum(Platform).optional(),
    niche: z.nativeEnum(Niche).optional(),
    lang: z.string().min(2).max(5).optional(),
    minBudgetCents: z.number().int().min(0).optional(),
    maxBudgetCents: z.number().int().min(0).optional(),
  })
  .refine((data) => {
    if (data.minBudgetCents === undefined || data.maxBudgetCents === undefined) return true;
    return data.minBudgetCents <= data.maxBudgetCents;
  }, { message: "minBudgetCents не может быть больше maxBudgetCents" });

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!user.creatorProfileId) {
    return NextResponse.json(
      { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора." },
      { status: 409 },
    );
  }

  const alerts = await prisma.savedJobAlert.findMany({
    where: { creatorProfileId: user.creatorProfileId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ alerts });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!user.creatorProfileId) {
    return NextResponse.json(
      { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора." },
      { status: 409 },
    );
  }

  const payload = await req.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const alert = await prisma.savedJobAlert.create({
    data: {
      creatorProfileId: user.creatorProfileId,
      name: parsed.data.name.trim(),
      platform: parsed.data.platform ?? null,
      niche: parsed.data.niche ?? null,
      lang: parsed.data.lang?.trim() || null,
      minBudgetCents: parsed.data.minBudgetCents ?? null,
      maxBudgetCents: parsed.data.maxBudgetCents ?? null,
    },
  });

  return NextResponse.json({ ok: true, alert }, { status: 201 });
}
