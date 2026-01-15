import { prisma } from "@/lib/prisma";

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
    console.error("[notifications] create failed", { userId, type: input.type, error });
  }
}

export async function markAllRead(userId: string): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  } catch (error) {
    console.error("[notifications] markAllRead failed", { userId, error });
  }
}
