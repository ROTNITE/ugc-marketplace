import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

type NotificationInput = {
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
};

export async function createNotification(userId: string, input: NotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
      },
    });
  } catch (error) {
    log("error", "notifications", {
      message: "create failed",
      userId,
      type: input.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function markAllRead(userId: string): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  } catch (error) {
    log("error", "notifications", {
      message: "markAllRead failed",
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
