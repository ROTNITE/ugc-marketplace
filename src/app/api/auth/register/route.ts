import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { Role } from "@prisma/client";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { ensureRequestId, fail, ok } from "@/lib/api/contract";
import { logApiError } from "@/lib/request-id";

export async function POST(req: Request) {
  const requestId = ensureRequestId(req);
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Некорректные данные регистрации.",
        requestId,
        parsed.error.flatten(),
      );
    }

    const { email, password, role, name, companyName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail(409, API_ERROR_CODES.CONFLICT, "Этот email уже зарегистрирован.", requestId, {
        code: "EMAIL_EXISTS",
      });
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
                  companyName: (companyName?.trim() || "Бренд").slice(0, 120),
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

    return ok({ user }, requestId, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("DATABASE_URL")) {
      return fail(
        500,
        API_ERROR_CODES.INTERNAL_ERROR,
        "DATABASE_URL не задан. Создай .env (см. .env.example) и запусти: npm run db:up",
        requestId,
      );
    }
    if (
      message.includes("Can't reach database server") ||
      message.includes("ECONNREFUSED") ||
      message.includes("P1001") ||
      message.includes("P1000") ||
      message.includes("Authentication failed")
    ) {
      return fail(
        500,
        API_ERROR_CODES.INTERNAL_ERROR,
        "База данных недоступна. Проверьте, что docker compose up запущен, и DATABASE_URL указывает на правильный пароль.",
        requestId,
      );
    }
    logApiError("POST /api/auth/register failed", error, requestId);
    return fail(500, API_ERROR_CODES.INTERNAL_ERROR, "Не удалось создать аккаунт.", requestId);
  }
}
