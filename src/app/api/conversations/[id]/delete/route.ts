import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { participants: { select: { userId: true } }, job: { select: { status: true } } },
  });

  if (!conversation) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isParticipant = conversation.participants.some((p) => p.userId === user.id);
  if (!isParticipant) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (!conversation.job || !["COMPLETED", "CANCELED"].includes(conversation.job.status)) {
    return NextResponse.json({ error: "ONLY_COMPLETED" }, { status: 409 });
  }

  await prisma.conversation.delete({ where: { id: conversation.id } });

  return NextResponse.json({ ok: true });
}
