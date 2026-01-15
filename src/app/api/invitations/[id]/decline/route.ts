import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/outbox";
import { getCreatorIds } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!user.creatorProfileId) {
    return NextResponse.json(
      { error: "CREATOR_PROFILE_REQUIRED", message: "Заполните профиль креатора перед отклонением." },
      { status: 409 },
    );
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, jobId: true, creatorId: true },
    });

    const creatorIds = getCreatorIds(user);
    if (!invitation || !creatorIds.includes(invitation.creatorId)) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (invitation.status !== "SENT") {
      return NextResponse.json({ error: "ALREADY_HANDLED" }, { status: 409 });
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
