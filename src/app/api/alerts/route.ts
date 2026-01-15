import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Platform, Niche } from "@prisma/client";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";
import { buildCreatedAtCursorWhere, decodeCursor, parseCursor, parseLimit, sliceWithNextCursor } from "@/lib/pagination";

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

export async function GET(req: Request) {
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

  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const limit = parseLimit(params);
  const cursor = decodeCursor<{ createdAt: string; id: string }>(parseCursor(params));
  const cursorWhere = buildCreatedAtCursorWhere(cursor);

  const result = await prisma.savedJobAlert.findMany({
    where: {
      creatorProfileId: user.creatorProfileId,
      ...(cursorWhere ? { AND: [cursorWhere] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const paged = sliceWithNextCursor(result, limit, (alert) => ({
    id: alert.id,
    createdAt: alert.createdAt.toISOString(),
  }));

  return NextResponse.json({ items: paged.items, nextCursor: paged.nextCursor });
}

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("CREATOR");
    if (!user.creatorProfileId) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Заполните профиль креатора.", requestId, {
        code: "CREATOR_PROFILE_REQUIRED",
      });
    }

    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

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

    return ok({ alert }, requestId, { status: 201 });
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/alerts failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось создать алерт.", requestId);
  }
}
