import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brandProfileSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Пользователь не найден. Выйдите и войдите снова." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = brandProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные профиля.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const companyName = data.companyName.trim();
    const website = data.website?.trim() || null;
    const description = data.description?.trim() || null;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { name: companyName },
      });

      await tx.brandProfile.upsert({
        where: { userId: user.id },
        update: {
          companyName,
          website,
          description,
        },
        create: {
          userId: user.id,
          companyName,
          website,
          description,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
