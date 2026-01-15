import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}

function requireAuth(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  const secret = process.env.OUTBOX_CONSUMER_SECRET;
  if (!secret) return false;
  return token === secret;
}

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
  if (!requireAuth(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(limitParam || 50, 1), 100);
  const cursorValue = searchParams.get("cursor");
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  if (cursorValue && !cursor) {
    return NextResponse.json({ error: "BAD_CURSOR" }, { status: 400 });
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
    take: limit,
  });

  const last = events[events.length - 1];
  const nextCursor = last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt,
    })),
    nextCursor,
  });
}
