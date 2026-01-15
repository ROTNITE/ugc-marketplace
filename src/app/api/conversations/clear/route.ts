import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  await prisma.conversation.deleteMany({
    where: {
      participants: { some: { userId: user.id } },
      job: { status: { in: ["COMPLETED", "CANCELED"] } },
    },
  });

  return NextResponse.json({ ok: true });
}
