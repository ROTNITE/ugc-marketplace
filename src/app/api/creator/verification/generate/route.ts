import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, mapAuthError, ok } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logApiError } from "@/lib/request-id";

const CODE_PREFIX = "UGC-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `${CODE_PREFIX}${value}`;
}

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("CREATOR");
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return fail(
        404,
        API_ERROR_CODES.NOT_FOUND,
        "Профиль креатора не найден. Заполните профиль и попробуйте снова.",
        requestId,
      );
    }

    if (profile.verificationCode) {
      return ok({ code: profile.verificationCode, status: profile.verificationStatus }, requestId);
    }

    let code = makeCode();
    let attempts = 0;
    while (attempts < 5) {
      // ensure uniqueness
      const exists = await prisma.creatorProfile.findFirst({
        where: { verificationCode: code },
        select: { id: true },
      });
      if (!exists) break;
      code = makeCode();
      attempts += 1;
    }

    const updated = await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { verificationCode: code },
      select: { verificationCode: true, verificationStatus: true },
    });

    return ok({ code: updated.verificationCode, status: updated.verificationStatus }, requestId);
  } catch (error) {
    const authError = mapAuthError(error, requestId);
    if (authError) return authError;
    logApiError("POST /api/creator/verification/generate failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось создать код.", requestId);
  }
}
