import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson } from "@/lib/api/contract";
import { getOutboxAuthToken } from "@/lib/outbox-auth";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  if (!getOutboxAuthToken(req)) {
    return fail(401, API_ERROR_CODES.OUTBOX_AUTH_ERROR, "Неверный токен.", requestId);
  }

  const parsed = await parseJson(req, schema, requestId);
  if ("errorResponse" in parsed) return parsed.errorResponse;

  try {
    const result = await prisma.outboxEvent.updateMany({
      where: { id: { in: parsed.data.ids }, processedAt: null },
      data: { processedAt: new Date() },
    });

    return ok({ ackedCount: result.count }, requestId);
  } catch {
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
