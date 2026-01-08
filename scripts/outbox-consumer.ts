import fs from "node:fs";
import path from "node:path";

type OutboxEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const secret = process.env.OUTBOX_CONSUMER_SECRET;
const limit = Math.min(Math.max(Number(process.env.OUTBOX_PULL_LIMIT ?? "50"), 1), 100);
const watch = process.argv.includes("--watch") || process.env.OUTBOX_WATCH === "1";
const intervalMs = Number(process.env.OUTBOX_POLL_INTERVAL ?? "5000");
const cursorPath = path.join(process.cwd(), ".outbox-cursor.json");

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

function formatPayload(payload: Record<string, unknown>) {
  const keys = ["jobId", "conversationId", "applicationId", "escrowId", "payoutRequestId"];
  const parts = keys
    .map((key) => (payload[key] ? `${key}=${payload[key]}` : null))
    .filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

async function pullOnce() {
  const cursor = loadCursor();
  const url = new URL("/api/outbox/pull", baseUrl);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pull failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { events: OutboxEvent[]; nextCursor: string | null };
  if (!Array.isArray(data.events)) {
    throw new Error("pull failed: invalid response shape");
  }

  if (data.events.length === 0) {
    return { count: 0, nextCursor: data.nextCursor ?? cursor };
  }

  for (const event of data.events) {
    console.log(`[${event.createdAt}] ${event.type}${formatPayload(event.payload)}`);
  }

  const ackRes = await fetch(new URL("/api/outbox/ack", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: data.events.map((event) => event.id) }),
  });

  if (!ackRes.ok) {
    const text = await ackRes.text();
    throw new Error(`ack failed (${ackRes.status}): ${text}`);
  }

  saveCursor(data.nextCursor ?? cursor);

  return { count: data.events.length, nextCursor: data.nextCursor ?? cursor };
}

async function run() {
  if (!watch) {
    const result = await pullOnce();
    console.log(`Done. Pulled ${result.count} event(s).`);
    return;
  }

  console.log(`Watching outbox at ${baseUrl} (interval ${intervalMs}ms)...`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await pullOnce();
      if (result.count > 0) {
        console.log(`Pulled ${result.count} event(s).`);
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
