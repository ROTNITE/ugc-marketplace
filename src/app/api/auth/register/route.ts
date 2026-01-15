import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные регистрации.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, password, role, name, companyName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name: name?.trim() || null,
        passwordHash,
        role: role === "BRAND" ? Role.BRAND : Role.CREATOR,
        brandProfile:
          role === "BRAND"
            ? {
                create: {
                  companyName: (companyName?.trim() || "Brand").slice(0, 120),
                  isVerified: false,
                },
              }
            : undefined,
        creatorProfile:
          role === "CREATOR"
            ? {
                create: {
                  languages: ["ru"],
                  isVerified: false,
                },
              }
            : undefined,
      },
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("DATABASE_URL")) {
      return NextResponse.json(
        { error: "DATABASE_URL не задан. Создай .env (см. .env.example) и запусти: npm run db:up" },
        { status: 500 },
      );
    }
    if (
      message.includes("Can't reach database server") ||
      message.includes("ECONNREFUSED") ||
      message.includes("P1001") ||
      message.includes("P1000") ||
      message.includes("Authentication failed")
    ) {
      return NextResponse.json(
        {
          error:
            "База данных недоступна. Проверьте, что docker compose up запущен, и DATABASE_URL указывает на правильный пароль.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
