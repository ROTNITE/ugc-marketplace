import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  await markAllRead(user.id);
  return NextResponse.json({ ok: true });
}
