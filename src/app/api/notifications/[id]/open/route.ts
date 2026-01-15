import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function safeRedirectPath(href: string | null | undefined, fallback: string) {
  if (!href) return fallback;
  if (!href.startsWith("/")) return fallback;
  if (href.startsWith("//")) return fallback;
  return href;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, href: true, isRead: true },
  });

  const fallback = user.role === "ADMIN" ? "/admin/notifications" : "/dashboard/notifications";
  if (!notification || notification.userId !== user.id) {
    return NextResponse.redirect(new URL(fallback, req.url));
  }

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
  }

  const target = safeRedirectPath(notification.href, fallback);
  return NextResponse.redirect(new URL(target, req.url));
}
