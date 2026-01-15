import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { emitEvent } from "@/lib/outbox";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const existing = await prisma.telegramAccount.findUnique({
    where: { userId: user.id },
    select: { telegramUserId: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: true });
  }

  await prisma.telegramAccount.delete({ where: { userId: user.id } });

  await createNotification(user.id, {
    type: "TELEGRAM_UNBOUND",
    title: "Telegram отвязан",
    body: "Привязка Telegram удалена.",
    href: "/dashboard/profile",
  });

  await emitEvent("TELEGRAM_UNBOUND", { userId: user.id, telegramUserId: existing.telegramUserId }).catch(() => {});

  return NextResponse.json({ ok: true });
}
