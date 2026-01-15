import fs from "node:fs";
import path from "node:path";

type OutboxEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type ApiOk<T> = { ok: true; data: T; requestId: string };
type ApiError = { ok: false; error: { code: string; message: string; details?: unknown }; requestId: string };

const args = process.argv.slice(2);

function hasFlag(name: string) {
  return args.includes(`--${name}`);
}

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = args.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0 && idx < args.length - 1) return args[idx + 1];
  return undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const baseUrl = getArgValue("base-url") ?? process.env.BASE_URL ?? "http://localhost:3000";
const secret = getArgValue("secret") ?? process.env.OUTBOX_CONSUMER_SECRET;
const maxBatch = clamp(Number(getArgValue("max-batch") ?? process.env.OUTBOX_PULL_LIMIT ?? "50"), 1, 100);
const maxRetries = clamp(Number(getArgValue("max-retries") ?? process.env.OUTBOX_MAX_RETRIES ?? "5"), 1, 10);
const intervalValue = Number(getArgValue("interval") ?? process.env.OUTBOX_POLL_INTERVAL ?? "5000");
const intervalMs = Number.isFinite(intervalValue) ? intervalValue : 5000;
const watch = hasFlag("watch") || process.env.OUTBOX_WATCH === "1";
const once = hasFlag("once");
const dedupeTtlMs = Math.max(Number(process.env.OUTBOX_DEDUPE_TTL ?? "300000"), 30_000);
const cursorPath =
  getArgValue("cursor-file") ?? process.env.OUTBOX_CURSOR_FILE ?? path.join(process.cwd(), ".outbox-cursor.json");
const dedupeMap = new Map<string, number>();

if (!secret) {
  console.error("OUTBOX_CONSUMER_SECRET не задан. Добавьте его в .env.");
  process.exit(1);
}

function loadCursor(): string | null {
  if (!fs.existsSync(cursorPath)) return null;
  try {
    const raw = fs.readFileSync(cursorPath, "utf-8");
    const data = JSON.parse(raw);
    return typeof data?.cursor === "string" ? data.cursor : null;
  } catch {
    return null;
  }
}

function saveCursor(cursor: string | null) {
  fs.writeFileSync(cursorPath, JSON.stringify({ cursor }, null, 2), "utf-8");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneDedupe(now: number) {
  for (const [id, expiresAt] of dedupeMap.entries()) {
    if (expiresAt <= now) dedupeMap.delete(id);
  }
}

async function fetchWithRetry(
  url: URL,
  options: RequestInit,
  {
    label,
    attempts = maxRetries,
    baseDelayMs = 500,
    maxDelayMs = 5000,
  }: { label: string; attempts?: number; baseDelayMs?: number; maxDelayMs?: number },
) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : null;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === attempts) return res;
      const delayBase = Number.isFinite(retryAfterSec)
        ? Math.max(retryAfterSec as number, 1) * 1000
        : Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * delayBase * 0.3;
      await sleep(delayBase + jitter);
      continue;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      const delayBase = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * delayBase * 0.3;
      await sleep(delayBase + jitter);
    }
  }
  throw new Error(`${label} failed: ${String(lastError ?? "unknown error")}`);
}

function logEvent({
  requestId,
  eventId,
  type,
  attempt,
  durationMs,
}: {
  requestId: string;
  eventId: string;
  type: string;
  attempt: number;
  durationMs: number;
}) {
  console.log(
    `[outbox] requestId=${requestId} eventId=${eventId} type=${type} attempt=${attempt} durationMs=${durationMs}`,
  );
}

async function pullOnce() {
  const cursor = loadCursor();
  const url = new URL("/api/outbox/pull", baseUrl);
  url.searchParams.set("limit", String(maxBatch));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetchWithRetry(
    url,
    {
      headers: { Authorization: `Bearer ${secret}` },
    },
    { label: "outbox pull" },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pull failed (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as ApiOk<{ events: OutboxEvent[]; nextCursor: string | null }> | ApiError;
  if (!payload || payload.ok !== true) {
    const errorMessage = payload && payload.ok === false ? payload.error.message : "invalid response";
    throw new Error(`pull failed: ${errorMessage}`);
  }

  const data = payload.data;
  const requestId = payload.requestId;
  if (!Array.isArray(data.events)) {
    throw new Error("pull failed: invalid response shape");
  }

  if (data.events.length === 0) {
    const next = data.nextCursor ?? cursor;
    if (next !== cursor) saveCursor(next);
    return { processed: 0, total: 0, nextCursor: next };
  }

  const now = Date.now();
  pruneDedupe(now);
  let processed = 0;
  const ackIds: string[] = [];

  for (const event of data.events) {
    const expiresAt = dedupeMap.get(event.id);
    if (expiresAt && expiresAt > now) {
      ackIds.push(event.id);
      continue;
    }
    const startedAt = Date.now();
    dedupeMap.set(event.id, now + dedupeTtlMs);
    processed += 1;
    ackIds.push(event.id);
    logEvent({
      requestId,
      eventId: event.id,
      type: event.type,
      attempt: 1,
      durationMs: Date.now() - startedAt,
    });
  }

  if (ackIds.length) {
    const ackRes = await fetchWithRetry(
      new URL("/api/outbox/ack", baseUrl),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: ackIds }),
      },
      { label: "outbox ack", attempts: Math.min(maxRetries, 5), baseDelayMs: 700, maxDelayMs: 7000 },
    );

    if (!ackRes.ok) {
      const text = await ackRes.text();
      throw new Error(`ack failed (${ackRes.status}): ${text}`);
    }
  }

  const next = data.nextCursor ?? cursor;
  if (next) saveCursor(next);

  return { processed, total: data.events.length, nextCursor: next };
}

async function run() {
  if (once || !watch) {
    const result = await pullOnce();
    console.log(`Done. Processed ${result.processed}/${result.total} event(s).`);
    return;
  }

  console.log(`Watching outbox at ${baseUrl} (interval ${intervalMs}ms, maxBatch ${maxBatch})...`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await pullOnce();
      if (result.processed > 0) {
        console.log(`Processed ${result.processed}/${result.total} event(s).`);
      }
    } catch (error) {
      console.error(error);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
