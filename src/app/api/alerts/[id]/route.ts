import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
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

  const alert = await prisma.savedJobAlert.findUnique({
    where: { id: params.id },
    select: { id: true, creatorProfileId: true },
  });

  if (!alert || alert.creatorProfileId !== user.creatorProfileId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.savedJobAlert.delete({ where: { id: alert.id } });

  return NextResponse.json({ ok: true });
}
