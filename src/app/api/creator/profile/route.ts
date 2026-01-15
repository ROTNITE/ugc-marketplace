import { prisma } from "@/lib/prisma";
import { creatorProfileSchema } from "@/lib/validators";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok, parseJson, mapAuthError } from "@/lib/api/contract";
import { requireRole } from "@/lib/authz";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const user = await requireRole("CREATOR");
    const parsed = await parseJson(req, creatorProfileSchema, requestId);
    if ("errorResponse" in parsed) return parsed.errorResponse;

    const data = parsed.data;
    const displayName = data.displayName?.trim() || null;
    const portfolioLinks = data.portfolioLinks ?? [];
    const normalizedLinks = Array.from(
      new Set(portfolioLinks.map((link) => link.trim()).filter(Boolean)),
    ).slice(0, 10);

    const profile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { name: displayName },
      });

      const updatedProfile = await tx.creatorProfile.upsert({
        where: { userId: user.id },
        update: {
          bio: data.bio?.trim() || null,
          languages: data.languages ?? [],
          niches: data.niches ?? [],
          platforms: data.platforms ?? [],
          pricePerVideo: data.pricePerVideo ?? null,
          currency: data.currency ?? undefined,
          isPublic: data.isPublic ?? false,
        },
        create: {
          userId: user.id,
          bio: data.bio?.trim() || null,
          languages: data.languages ?? [],
          niches: data.niches ?? [],
          platforms: data.platforms ?? [],
          pricePerVideo: data.pricePerVideo ?? null,
          currency: data.currency ?? undefined,
          isPublic: data.isPublic ?? false,
        },
        select: { id: true, currency: true },
      });

      await tx.portfolioItem.deleteMany({ where: { creatorId: updatedProfile.id } });
      if (normalizedLinks.length) {
        await tx.portfolioItem.createMany({
          data: normalizedLinks.map((url) => ({
            creatorId: updatedProfile.id,
            url,
          })),
        });
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: user.id },
        select: { balanceCents: true, currency: true },
      });

      if (!wallet) {
        await tx.wallet.create({
          data: { userId: user.id, balanceCents: 0, currency: updatedProfile.currency },
        });
      } else if (wallet.balanceCents === 0 && wallet.currency !== updatedProfile.currency) {
        await tx.wallet.update({
          where: { userId: user.id },
          data: { currency: updatedProfile.currency },
        });
      }

      return updatedProfile;
    });

    return ok({ profile }, requestId);
  } catch (error) {
    const mapped = mapAuthError(error, requestId);
    if (mapped) return mapped;
    return fail(500, API_ERROR_CODES.INVARIANT_VIOLATION, "Ошибка сервера.", requestId);
  }
}
