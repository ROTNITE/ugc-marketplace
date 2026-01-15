export type SearchParams = Record<string, string | string[] | undefined>;

export type CursorPayload = Record<string, unknown>;

export function getSearchParam(searchParams: SearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseLimit(
  searchParams: SearchParams,
  options?: { key?: string; defaultLimit?: number; maxLimit?: number },
) {
  const key = options?.key ?? "limit";
  const raw = getSearchParam(searchParams, key);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const defaultLimit = options?.defaultLimit ?? 20;
  const maxLimit = options?.maxLimit ?? 50;
  if (!Number.isFinite(parsed)) return defaultLimit;
  return Math.min(Math.max(parsed, 1), maxLimit);
}

export function parseCursor(searchParams: SearchParams, key = "cursor") {
  const raw = getSearchParam(searchParams, key);
  return raw || null;
}

export function encodeCursor(payload: CursorPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decodeCursor<T extends CursorPayload>(value: string | null): T | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function buildCreatedAtCursorWhere(
  cursor: { createdAt: string; id: string } | null,
  direction: "desc" | "asc" = "desc",
) {
  if (!cursor) return null;
  const createdAt = new Date(cursor.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  const op = direction === "desc" ? "lt" : "gt";
  const idOp = direction === "desc" ? "lt" : "gt";
  return {
    OR: [
      { createdAt: { [op]: createdAt } },
      { createdAt, id: { [idOp]: cursor.id } },
    ],
  };
}

export function buildUpdatedAtCursorWhere(
  cursor: { updatedAt: string; id: string } | null,
  direction: "desc" | "asc" = "desc",
) {
  if (!cursor) return null;
  const updatedAt = new Date(cursor.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;
  const op = direction === "desc" ? "lt" : "gt";
  const idOp = direction === "desc" ? "lt" : "gt";
  return {
    OR: [
      { updatedAt: { [op]: updatedAt } },
      { updatedAt, id: { [idOp]: cursor.id } },
    ],
  };
}

export function sliceWithNextCursor<T>(items: T[], limit: number, getCursor: (item: T) => CursorPayload) {
  if (items.length <= limit) {
    return { items, nextCursor: null };
  }
  const sliced = items.slice(0, limit);
  const last = sliced[sliced.length - 1];
  return { items: sliced, nextCursor: encodeCursor(getCursor(last)) };
}
