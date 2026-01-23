import { NextResponse } from "next/server";

export function GET() {
  const ts = new Date().toISOString();
  return NextResponse.json({ ok: true, ts, timestamp: ts });
}
