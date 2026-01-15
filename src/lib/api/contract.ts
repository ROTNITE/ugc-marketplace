import { NextResponse } from "next/server";
import type { ZodTypeAny, infer as ZodInfer } from "zod";
import { API_ERROR_CODES, type ApiErrorCode } from "@/lib/api/errors";
import { createRequestId, getRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

type ErrorPayload = {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

type OkPayload<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export function ensureRequestId(req: Request) {
  return getRequestId(req) ?? createRequestId();
}

export function ok<T>(data: T, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json<OkPayload<T>>({ ok: true, data, requestId }, init);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
  init?: ResponseInit,
) {
  const response = NextResponse.json<ErrorPayload>(
    { ok: false, error: { code, message, details }, requestId },
    { status, ...init },
  );
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export async function parseJson<TSchema extends ZodTypeAny>(
  req: Request,
  schema: TSchema,
  requestId: string,
) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return {
        errorResponse: fail(
          400,
          API_ERROR_CODES.VALIDATION_ERROR,
          "Некорректные данные.",
          requestId,
          parsed.error.flatten(),
        ),
      };
    }
    return { data: parsed.data as ZodInfer<TSchema> };
  } catch {
    return {
      errorResponse: fail(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Некорректный JSON.",
        requestId,
      ),
    };
  }
}

export function mapAuthError(error: unknown, requestId: string) {
  if (!(error instanceof Error)) return null;
  if (error.message === "UNAUTHORIZED") {
    return fail(401, API_ERROR_CODES.UNAUTHORIZED, "Требуется авторизация.", requestId);
  }
  if (error.message === "FORBIDDEN") {
    return fail(403, API_ERROR_CODES.FORBIDDEN, "Недостаточно прав.", requestId);
  }
  if (error.message === "NOT_FOUND") {
    return fail(404, API_ERROR_CODES.NOT_FOUND, "Ресурс не найден.", requestId);
  }
  if (error.message === "STALE_SESSION") {
    return fail(
      401,
      API_ERROR_CODES.STALE_SESSION,
      "Сессия устарела. Выйдите и войдите заново.",
      requestId,
      { action: "SIGN_IN" },
    );
  }
  return null;
}
