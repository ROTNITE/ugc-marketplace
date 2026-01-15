import { prisma } from "@/lib/prisma";

export async function emitEvent(type: string, payload: unknown): Promise<void> {
  try {
    const safePayload = JSON.parse(JSON.stringify(payload ?? null));
    await prisma.outboxEvent.create({
      data: {
        type,
        payload: safePayload,
      },
    });
  } catch (error) {
    console.error("[outbox] failed to emit event", { type, error });
  }
}
