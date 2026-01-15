import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok, parseJson } from "@/lib/api/contract";
import { requireUser } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

const schema = z.object({
  jobId: z.string().uuid().optional(),
  participantId: z.string().uuid(),
});

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireUser();
    const parsed = await parseJson(req, schema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const conv = await prisma.conversation.create({
      data: {
        jobId: parsed.data.jobId ?? null,
        participants: {
          create: [{ userId: user.id }, { userId: parsed.data.participantId }],
        },
      },
    });

    return ok({ conversation: conv }, requestId, { status: 201 });
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/conversations failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось создать чат.", requestId);
  }
}
