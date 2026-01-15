import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { Currency } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  commissionBps: z.preprocess(
    (value) => (typeof value === "string" ? Number.parseInt(value, 10) : value),
    z.number().int().min(0).max(10000),
  ),
  defaultCurrency: z.nativeEnum(Currency),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_SETTINGS", details: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {
      commissionBps: parsed.data.commissionBps,
      defaultCurrency: parsed.data.defaultCurrency,
    },
    create: {
      id: "singleton",
      commissionBps: parsed.data.commissionBps,
      defaultCurrency: parsed.data.defaultCurrency,
    },
    select: { commissionBps: true, defaultCurrency: true },
  });

  return NextResponse.json({ ok: true, settings });
}
