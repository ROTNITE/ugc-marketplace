import { NextResponse } from "next/server";
import { z } from "zod";
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

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export async function POST(req: Request) {
  if (!requireAuth(req)) return unauthorized();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await prisma.outboxEvent.updateMany({
      where: { id: { in: parsed.data.ids }, processedAt: null },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({ processed: result.count });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
