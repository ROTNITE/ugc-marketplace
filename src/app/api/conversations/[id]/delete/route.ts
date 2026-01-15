import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireConversationParticipant, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(_req);
  try {
    const user = await requireUser();
    const authz = await requireConversationParticipant(params.id, user).catch((error) => {
      const mapped = mapAuthError(error, requestId);
      if (mapped) return { errorResponse: mapped };
      return { errorResponse: fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId) };
    });

    if ("errorResponse" in authz) return authz.errorResponse;
    const { conversation } = authz;

    if (!conversation.job || !["COMPLETED", "CANCELED"].includes(conversation.job.status)) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Удалять можно только завершённые чаты.", requestId, {
        code: "ONLY_COMPLETED",
      });
    }

    await prisma.conversation.delete({ where: { id: conversation.id } });

    return ok({ deleted: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/conversations/[id]/delete failed", error, requestId, { conversationId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось удалить чат.", requestId);
  }
}
