import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API route that returns the count of unread notifications for the
 * authenticated user. The client polls this endpoint to update
 * its badge in real‑time. If the user is not logged in the count
 * will always be zero.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  let count = 0;
  if (user) {
    try {
      count = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      });
    } catch (error) {
      // swallow errors and return zero on failure to avoid breaking the UI
      count = 0;
    }
  }
  return NextResponse.json({ count });
}