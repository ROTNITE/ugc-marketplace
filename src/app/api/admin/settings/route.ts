import { z } from "zod";
import { Currency } from "@prisma/client";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson } from "@/lib/api/contract";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";
import { mapAuthError } from "@/lib/api/contract";
import { requireAdmin } from "@/lib/authz";

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
    await requireAdmin();

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
