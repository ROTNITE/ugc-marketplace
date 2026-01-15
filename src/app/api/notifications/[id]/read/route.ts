import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, isRead: true },
  });

  if (!notification) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (notification.userId !== user.id) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ ok: true });
}
