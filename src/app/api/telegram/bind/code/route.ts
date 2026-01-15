import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBindingCode, hashBindingCode } from "@/lib/telegram/binding";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.telegramAccount.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "ALREADY_BOUND", message: "Telegram уже привязан. Сначала отвяжите текущую привязку." },
      { status: 409 },
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
  const code = generateBindingCode();
  const codeHash = hashBindingCode(code);

  await prisma.$transaction(async (tx) => {
    await tx.telegramBindingRequest.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    await tx.telegramBindingRequest.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });
  });

  return NextResponse.json({ code, expiresAt });
}
