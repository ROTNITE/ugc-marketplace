import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBrandOwner } from "@/lib/authz";

export async function POST(
  _req: Request,
  { params }: { params: { id: string; applicationId: string } },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: { id: true, brandId: true },
    });

    if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (!isBrandOwner(user, job.brandId)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.applicationId },
      select: { id: true, jobId: true, status: true },
    });

    if (!application || application.jobId !== job.id) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (application.status !== "PENDING") {
      return NextResponse.json({ error: "Отклик уже обработан." }, { status: 409 });
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ ok: true, application: updated });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
