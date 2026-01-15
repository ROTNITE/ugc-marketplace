import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCreatorOwner } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const application = await prisma.application.findUnique({ where: { id: params.id } });
    if (!application) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (!isCreatorOwner(user, application.creatorId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "Отклик уже обработан и не может быть отозван." }, { status: 409 });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "WITHDRAWN" },
    });

    return NextResponse.json({ ok: true, application: updated });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
