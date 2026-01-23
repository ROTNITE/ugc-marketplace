import { log } from "@/lib/logger";

export const REQUEST_ID_HEADER = "x-request-id";

function fallbackRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return fallbackRequestId();
}

export function getRequestId(input: { headers: Headers } | Request) {
  return input.headers.get(REQUEST_ID_HEADER);
}

export function logApiError(
  message: string,
  error: unknown,
  requestId?: string | null,
  meta?: Record<string, unknown>,
) {
  log("error", "api", {
    message,
    requestId: requestId ?? "n/a",
    error: error instanceof Error ? error.message : String(error),
    ...meta,
  });
}
