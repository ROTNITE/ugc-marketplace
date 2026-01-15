import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";
import { getBrandCompleteness } from "@/lib/profiles/completeness";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, brandId: true, status: true, activeCreatorId: true },
  });

  if (!job || !isBrandOwner(user, job.brandId)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (job.activeCreatorId) return NextResponse.json({ error: "HAS_CREATOR" }, { status: 409 });
  if (job.status !== "PAUSED") return NextResponse.json({ error: "ONLY_PAUSED" }, { status: 409 });

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { userId: user.id },
  });
  const completeness = getBrandCompleteness({
    companyName: brandProfile?.companyName ?? user.name ?? "",
    website: brandProfile?.website ?? "",
    description: brandProfile?.description ?? "",
  });
  if (completeness.missing.length > 0) {
    return NextResponse.json(
      {
        error: "BRAND_PROFILE_INCOMPLETE",
        message: "Заполните профиль бренда перед публикацией заказа.",
        completeProfile: true,
        missing: completeness.missing,
        profileUrl: "/dashboard/profile",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json({ ok: true, job: updated });
}
