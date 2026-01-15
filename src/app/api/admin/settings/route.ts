import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { Currency } from "@prisma/client";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson } from "@/lib/api/contract";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";
import { authOptions } from "@/lib/auth";
import { mapAuthError } from "@/lib/api/contract";

const schema = z.object({
  commissionBps: z.preprocess(
    (value) => (typeof value === "string" ? Number.parseInt(value, 10) : value),
    z.number().int().min(0).max(10000),
  ),
  defaultCurrency: z.nativeEnum(Currency),
});

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user) return fail(401, API_ERROR_CODES.UNAUTHORIZED, "Требуется авторизация.", requestId);
    if (user.role !== "ADMIN") {
      return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
    }

    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

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

    return ok({ settings }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/admin/settings failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось сохранить настройки.", requestId);
  }
}
