import { prisma } from "@/lib/prisma";
import { brandProfileSchema } from "@/lib/validators";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("BRAND");
    const parsed = await parseJson(req, brandProfileSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return fail(404, API_ERROR_CODES.NOT_FOUND, "Пользователь не найден.", requestId);
    }

    const data = parsed.data;
    const companyName = data.companyName.trim();
    const website = data.website?.trim() || null;
    const description = data.description?.trim() || null;

    const profile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { name: companyName },
      });

      return tx.brandProfile.upsert({
        where: { userId: user.id },
        update: {
          companyName,
          website,
          description,
        },
        create: {
          userId: user.id,
          companyName,
          website,
          description,
        },
      });
    });

    return ok({ profile }, requestId);
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
