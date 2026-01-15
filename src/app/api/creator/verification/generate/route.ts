import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CODE_PREFIX = "UGC-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `${CODE_PREFIX}${value}`;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Профиль креатора не найден. Заполните профиль и попробуйте снова." },
      { status: 404 },
    );
  }

  if (profile.verificationCode) {
    return NextResponse.json({
      ok: true,
      code: profile.verificationCode,
      status: profile.verificationStatus,
    });
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

  return NextResponse.json({ ok: true, code: updated.verificationCode, status: updated.verificationStatus });
}
