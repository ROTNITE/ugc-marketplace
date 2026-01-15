import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { getCreatorIds } from "@/lib/authz";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const requestId = ensureRequestId(req);

  try {
    const user = await requireRole("CREATOR");
    if (!user.creatorProfileId) {
      return fail(
        409,
        API_ERROR_CODES.CONFLICT,
        "Заполните профиль креатора перед отклонением.",
        requestId,
        { code: "CREATOR_PROFILE_REQUIRED", profileUrl: "/dashboard/profile" },
      );
    }
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, jobId: true, creatorId: true },
    });

    const creatorIds = getCreatorIds(user);
    if (!invitation || !creatorIds.includes(invitation.creatorId)) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Приглашение не найдено.", requestId);
    }

    if (invitation.status !== "SENT") {
      return fail(409, API_ERROR_CODES.CONFLICT, "Приглашение уже обработано.", requestId, {
        code: "ALREADY_HANDLED",
      });
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "DECLINED" },
    });

    await emitEvent("INVITATION_DECLINED", {
      invitationId: invitation.id,
      jobId: invitation.jobId,
      creatorId: invitation.creatorId,
    });

    return ok({ declined: true }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("[api] invitations:decline failed", error, requestId, { invitationId: params.id });
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось отклонить приглашение.", requestId);
  }
}
