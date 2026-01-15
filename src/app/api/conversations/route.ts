import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  jobId: z.string().uuid().optional(),
  participantId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 });
    }

    const conv = await prisma.conversation.create({
      data: {
        jobId: parsed.data.jobId ?? null,
        participants: {
          create: [{ userId: user.id }, { userId: parsed.data.participantId }],
        },
      },
    });

    return NextResponse.json({ ok: true, conversation: conv }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
