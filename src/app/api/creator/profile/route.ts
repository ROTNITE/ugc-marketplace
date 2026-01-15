import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creatorProfileSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = creatorProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные профиля.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const displayName = data.displayName?.trim() || null;
    const normalizedLinks = Array.from(
      new Set(data.portfolioLinks.map((link) => link.trim()).filter(Boolean)),
    ).slice(0, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { name: displayName },
      });

      const profile = await tx.creatorProfile.upsert({
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

      await tx.portfolioItem.deleteMany({ where: { creatorId: profile.id } });
      if (normalizedLinks.length) {
        await tx.portfolioItem.createMany({
          data: normalizedLinks.map((url) => ({
            creatorId: profile.id,
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
          data: { userId: user.id, balanceCents: 0, currency: profile.currency },
        });
      } else if (wallet.balanceCents === 0 && wallet.currency !== profile.currency) {
        await tx.wallet.update({
          where: { userId: user.id },
          data: { currency: profile.currency },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
