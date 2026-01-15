import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok } from "@/lib/api/contract";
import { rateLimit } from "@/lib/api/rate-limit";
import { getOutboxAuthToken } from "@/lib/outbox-auth";

type Cursor = { createdAt: Date; id: string };

function decodeCursor(value: string): Cursor | null {
  try {
    const json = Buffer.from(value, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed?.createdAt || !parsed?.id) return null;
    const date = new Date(parsed.createdAt);
    if (Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id: String(parsed.id) };
  } catch {
    return null;
  }
}

function encodeCursor(cursor: { createdAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })).toString("base64");
}

export async function GET(req: Request) {
  const requestId = ensureRequestId(req);
  const token = getOutboxAuthToken(req);
  if (!token) {
    return fail(401, API_ERROR_CODES.OUTBOX_AUTH_ERROR, "Неверный токен.", requestId);
  }

  const rate = rateLimit(`outbox:${token}`, { windowMs: 60_000, max: 60 });
  if (!rate.allowed) {
    return fail(
      429,
      API_ERROR_CODES.RATE_LIMITED,
      "Слишком много запросов.",
      requestId,
      { retryAfterSec: rate.retryAfterSec },
      { headers: { "Retry-After": String(rate.retryAfterSec ?? 1) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(limitParam || 50, 1), 100);
  const cursorValue = searchParams.get("cursor");
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  if (cursorValue && !cursor) {
    return fail(400, API_ERROR_CODES.VALIDATION_ERROR, "Некорректный курсор.", requestId);
  }

  const where: Prisma.OutboxEventWhereInput = { processedAt: null };
  if (cursor) {
    where.OR = [
      { createdAt: { gt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { gt: cursor.id } },
    ];
  }

  const events = await prisma.outboxEvent.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
  });

  const items = events.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor = last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

  return ok(
    {
      events: items.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
      nextCursor,
    },
    requestId,
  );
}
