import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  isActive: z.boolean(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

  const payload = await req.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
  }

  const alert = await prisma.savedJobAlert.findUnique({
    where: { id: params.id },
    select: { id: true, creatorProfileId: true },
  });

  if (!alert || alert.creatorProfileId !== user.creatorProfileId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const updated = await prisma.savedJobAlert.update({
    where: { id: alert.id },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ ok: true, alert: updated });
}
