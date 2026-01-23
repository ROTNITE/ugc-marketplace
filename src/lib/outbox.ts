import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

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
    log("error", "outbox", {
      message: "failed to emit event",
      type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
