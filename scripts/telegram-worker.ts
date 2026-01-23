import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const normalized = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
      const eqIndex = normalized.indexOf("=");
      if (eqIndex === -1) continue;
      const key = normalized.slice(0, eqIndex).trim();
      let value = normalized.slice(eqIndex + 1).trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore env load errors
  }
}

loadEnvFromFile();

type ApiOk<T> = { ok: true; data: T; requestId: string };
type ApiError = { ok: false; error: { code: string; message: string; details?: unknown }; requestId: string };

type OutboxEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: {
      id: number;
      type: string;
      username?: string;
    };
    from?: {
      username?: string;
    };
  };
};

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

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

const baseUrl =
  getArgValue("base-url") ??
  process.env.APP_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.BASE_URL ??
  "http://localhost:3000";
const botToken = getArgValue("token") ?? process.env.TELEGRAM_BOT_TOKEN;
const botSecret =
  getArgValue("secret") ??
  process.env.TELEGRAM_BOT_SECRET ??
  process.env.TELEGRAM_BINDING_SECRET ??
  process.env.OUTBOX_CONSUMER_SECRET;
const outboxSecret = getArgValue("outbox-secret") ?? process.env.OUTBOX_CONSUMER_SECRET;
const intervalMs = Number(getArgValue("interval") ?? process.env.TELEGRAM_POLL_INTERVAL ?? "1500");
const watch = hasFlag("watch") || process.env.TELEGRAM_WATCH !== "0";
const once = hasFlag("once") || process.env.TELEGRAM_ONCE === "1";
const longPollTimeout = clamp(Number(process.env.TELEGRAM_LONGPOLL_TIMEOUT ?? "20"), 5, 50);
const maxBatch = clamp(Number(process.env.OUTBOX_PULL_LIMIT ?? "50"), 1, 100);
const maxRetries = clamp(Number(process.env.TELEGRAM_MAX_RETRIES ?? "5"), 1, 10);

const offsetPath =
  getArgValue("tg-offset-file") ??
  process.env.TELEGRAM_OFFSET_FILE ??
  path.join(process.cwd(), ".tg-offset.json");
const outboxCursorPath =
  getArgValue("outbox-cursor-file") ??
  process.env.OUTBOX_CURSOR_FILE ??
  path.join(process.cwd(), ".outbox-cursor.json");
const healthFilePath = getArgValue("health-file") ?? process.env.TELEGRAM_HEALTH_FILE ?? null;
const printHealth = hasFlag("print-health");

const updateDedupe = new Map<number, number>();
const eventDedupe = new Map<string, number>();
const dedupeTtlMs = Math.max(Number(process.env.TELEGRAM_DEDUPE_TTL ?? "300000"), 30_000);
type HealthSnapshot = {
  ts: string;
  scope: string;
  mode: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  outboundAt?: string | null;
  processed: number;
  sent: number;
  skipped: number;
  acked: number;
  errors: number;
};

const healthState: HealthSnapshot = {
  ts: new Date().toISOString(),
  scope: "telegram",
  mode: once || !watch ? "once" : "watch",
  lastSuccessAt: null,
  lastErrorAt: null,
  processed: 0,
  sent: 0,
  skipped: 0,
  acked: 0,
  errors: 0,
};
const REQUEST_ID_HEADER = "x-request-id";

if (!botToken) {
  logLine("error", "worker", { msg: "TELEGRAM_BOT_TOKEN не задан. Добавьте его в .env." });
  process.exit(1);
}
if (!botSecret) {
  logLine("error", "worker", { msg: "TELEGRAM_BOT_SECRET не задан. Добавьте его в .env." });
  process.exit(1);
}
if (!outboxSecret) {
  logLine("error", "worker", { msg: "OUTBOX_CONSUMER_SECRET не задан. Добавьте его в .env." });
  process.exit(1);
}

function loadOffset(): number | null {
  if (!fs.existsSync(offsetPath)) return null;
  try {
    const raw = fs.readFileSync(offsetPath, "utf-8");
    const data = JSON.parse(raw);
    return Number.isFinite(data?.offset) ? Number(data.offset) : null;
  } catch {
    return null;
  }
}

function saveOffset(offset: number | null) {
  fs.writeFileSync(offsetPath, JSON.stringify({ offset }, null, 2), "utf-8");
}

function loadCursor(): string | null {
  if (!fs.existsSync(outboxCursorPath)) return null;
  try {
    const raw = fs.readFileSync(outboxCursorPath, "utf-8");
    const data = JSON.parse(raw);
    return typeof data?.cursor === "string" ? data.cursor : null;
  } catch {
    return null;
  }
}

function saveCursor(cursor: string | null) {
  fs.writeFileSync(outboxCursorPath, JSON.stringify({ cursor }, null, 2), "utf-8");
}

function maskId(value: string) {
  if (value.length <= 6) return value;
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function logLine(
  level: "info" | "warn" | "error",
  scope: string,
  fields: Record<string, string | number | boolean | null | undefined>,
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function updateHealth(partial?: Partial<HealthSnapshot>) {
  if (!healthFilePath) return;
  const now = new Date().toISOString();
  healthState.ts = now;
  if (partial) Object.assign(healthState, partial);
  fs.writeFileSync(healthFilePath, JSON.stringify(healthState, null, 2), "utf-8");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneMap<T>(map: Map<T, number>, now: number) {
  for (const [key, expiresAt] of map.entries()) {
    if (expiresAt <= now) map.delete(key);
  }
}

async function ensureServerAvailable() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(new URL("/api/health", baseUrl), { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    logLine("error", "worker", { error: `Сервер недоступен по адресу ${baseUrl}. Запустите "npm run dev".` });
    process.exit(1);
  } finally {
    clearTimeout(timeout);
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

async function fetchTelegram<T>(method: string, payload: Record<string, unknown>) {
  const startedAt = Date.now();
  const url = new URL(`https://api.telegram.org/bot${botToken}/${method}`);
  const res = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { label: `telegram ${method}`, attempts: Math.min(maxRetries, 4), baseDelayMs: 700, maxDelayMs: 7000 },
  );

  const json = (await res.json().catch(() => null)) as TelegramResponse<T> | null;
  if (!json || !json.ok) {
    const retryAfter = json?.parameters?.retry_after;
    if (retryAfter) {
      await sleep(Math.max(retryAfter, 1) * 1000);
    }
    healthState.errors += 1;
    updateHealth({ lastErrorAt: new Date().toISOString() });
    throw new Error(json?.description ?? `Telegram API error (${res.status})`);
  }
  logLine("info", "http", {
    msg: `telegram.${method}`,
    status: res.status,
    durationMs: Date.now() - startedAt,
  });
  return json.result as T;
}

async function sendTelegramMessage(chatId: string, text: string) {
  await fetchTelegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

function parseCommand(text: string) {
  const trimmed = text.trim();
  const [rawCommand, ...rest] = trimmed.split(/\s+/);
  const command = rawCommand.split("@")[0];
  return { command, args: rest.join(" ").trim() };
}

async function handleBind(chatId: string, username: string | null, code: string) {
  const startedAt = Date.now();
  const res = await fetchWithRetry(
    new URL("/api/telegram/bind/confirm", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-secret": botSecret ?? "",
      },
      body: JSON.stringify({
        code,
        telegramUserId: chatId,
        telegramUsername: username,
      }),
    },
    { label: "bind confirm", attempts: Math.min(maxRetries, 4), baseDelayMs: 600, maxDelayMs: 6000 },
  );
  const requestId = res.headers.get(REQUEST_ID_HEADER) ?? "n/a";
  logLine("info", "http", {
    msg: "telegram.bind.confirm",
    requestId,
    status: res.status,
    durationMs: Date.now() - startedAt,
  });

  const data = (await res.json().catch(() => null)) as ApiOk<unknown> | ApiError | null;
  if (!res.ok || !data || data.ok === false) {
    const message = data && "error" in data ? data.error.message : "Не удалось подтвердить привязку.";
    return { ok: false, message, requestId: data?.requestId ?? requestId };
  }
  return { ok: true, requestId: data.requestId ?? requestId };
}

async function pollUpdatesOnce() {
  const currentOffset = loadOffset();
  const url = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
  if (currentOffset) url.searchParams.set("offset", String(currentOffset));
  url.searchParams.set("timeout", String(longPollTimeout));
  url.searchParams.set("allowed_updates", JSON.stringify(["message"]));

  const res = await fetchWithRetry(url, { method: "GET" }, { label: "telegram getUpdates", attempts: 3 });
  const json = (await res.json().catch(() => null)) as TelegramResponse<TelegramUpdate[]> | null;
  if (!json || !json.ok || !Array.isArray(json.result)) {
    throw new Error(json?.description ?? "Telegram getUpdates failed");
  }

  const now = Date.now();
  pruneMap(updateDedupe, now);
  let nextOffset = currentOffset ?? null;

  for (const update of json.result) {
    if (updateDedupe.get(update.update_id)) continue;
    updateDedupe.set(update.update_id, now + dedupeTtlMs);
    healthState.processed += 1;

    const message = update.message;
    if (!message?.text) {
      nextOffset = update.update_id + 1;
      continue;
    }

    const chatId = String(message.chat.id);
    const username = message.chat.username ?? message.from?.username ?? null;
    const { command, args } = parseCommand(message.text);

    if (message.chat.type !== "private") {
      nextOffset = update.update_id + 1;
      continue;
    }

    if (command === "/start") {
      await sendTelegramMessage(
        chatId,
        "Привет! Откройте кабинет -> Профиль -> Telegram и сгенерируйте код, затем отправьте /bind CODE.",
      );
    } else if (command === "/bind") {
      if (!args) {
        await sendTelegramMessage(chatId, "Укажите код: /bind CODE");
      } else {
        const result = await handleBind(chatId, username, args);
        if (result.ok) {
          await sendTelegramMessage(chatId, "Привязка подтверждена. Можно возвращаться в кабинет.");
        } else {
          await sendTelegramMessage(chatId, result.message ?? "Не удалось подтвердить привязку.");
        }
      }
    }

    nextOffset = update.update_id + 1;
  }

  if (nextOffset !== null) saveOffset(nextOffset);
  updateHealth({ lastSuccessAt: new Date().toISOString() });
  return json.result.length;
}

function getString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

async function resolveConversationRecipients(conversationId: string, senderId: string | null) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: { select: { userId: true } } },
  });

  if (!conversation) return { userIds: [] };
  const userIds = conversation.participants
    .map((p) => p.userId)
    .filter((id) => id && id !== senderId);
  return { userIds };
}

function buildAppLink(pathname: string) {
  try {
    return new URL(pathname, baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/$/, "")}${pathname}`;
  }
}

const handledEventTypes = new Set([
  "MESSAGE_SENT",
  "APPLICATION_ACCEPTED",
  "INVITATION_SENT",
  "ESCROW_FUNDED",
  "SUBMISSION_SUBMITTED",
  "PAYOUT_APPROVED",
]);

async function resolveRecipientsForEvent(event: OutboxEvent) {
  const payload = event.payload ?? {};

  if (event.type === "MESSAGE_SENT") {
    const conversationId = getString(payload, "conversationId");
    const senderId = getString(payload, "senderId");
    if (!conversationId) return [];
    const resolved = await resolveConversationRecipients(conversationId, senderId);
    return resolved.userIds;
  }

  if (event.type === "APPLICATION_ACCEPTED") {
    const creatorId = getString(payload, "creatorId");
    return creatorId ? [creatorId] : [];
  }

  if (event.type === "INVITATION_SENT") {
    const creatorId = getString(payload, "creatorId");
    return creatorId ? [creatorId] : [];
  }

  if (event.type === "ESCROW_FUNDED") {
    const creatorId = getString(payload, "creatorId");
    return creatorId ? [creatorId] : [];
  }

  if (event.type === "SUBMISSION_SUBMITTED") {
    const brandId = getString(payload, "brandId");
    return brandId ? [brandId] : [];
  }

  if (event.type === "PAYOUT_APPROVED") {
    const creatorId = getString(payload, "creatorId");
    return creatorId ? [creatorId] : [];
  }

  return [];
}

function buildMessageForEvent(event: OutboxEvent) {
  const payload = event.payload ?? {};

  if (event.type === "MESSAGE_SENT") {
    const conversationId = getString(payload, "conversationId");
    const link = conversationId ? buildAppLink(`/dashboard/inbox/${conversationId}`) : buildAppLink("/dashboard/inbox");
    return `Новое сообщение.\nОткройте чат: ${link}`;
  }

  if (event.type === "APPLICATION_ACCEPTED") {
    const conversationId = getString(payload, "conversationId");
    const link = conversationId ? buildAppLink(`/dashboard/inbox/${conversationId}`) : buildAppLink("/dashboard/deals");
    return `Ваш отклик принят.\nПерейдите в чат: ${link}`;
  }

  if (event.type === "INVITATION_SENT") {
    const link = buildAppLink("/dashboard/invitations");
    return `Новое приглашение к заказу.\nОткройте приглашения: ${link}`;
  }

  if (event.type === "ESCROW_FUNDED") {
    const jobId = getString(payload, "jobId");
    if (!jobId) return null;
    const link = buildAppLink(`/dashboard/jobs/${jobId}`);
    return `Эскроу пополнен.\nПроверьте заказ: ${link}`;
  }

  if (event.type === "SUBMISSION_SUBMITTED") {
    const jobId = getString(payload, "jobId");
    if (!jobId) return null;
    const link = buildAppLink(`/dashboard/jobs/${jobId}/review`);
    return `Сданы материалы.\nПерейдите к проверке: ${link}`;
  }

  if (event.type === "PAYOUT_APPROVED") {
    const link = buildAppLink("/dashboard/balance");
    return `Выплата одобрена.\nПроверьте баланс: ${link}`;
  }

  return null;
}

async function resolveChatIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const accounts = await prisma.telegramAccount.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, telegramUserId: true },
  });
  return accounts.map((acc) => ({ userId: acc.userId, chatId: acc.telegramUserId }));
}

async function processOutboxOnce() {
  const cursor = loadCursor();
  const url = new URL("/api/outbox/pull", baseUrl);
  url.searchParams.set("limit", String(maxBatch));
  if (cursor) url.searchParams.set("cursor", cursor);

  const pullStartedAt = Date.now();
  const res = await fetchWithRetry(
    url,
    { headers: { Authorization: `Bearer ${outboxSecret}` } },
    { label: "outbox pull" },
  );
  const pullRequestId = res.headers.get(REQUEST_ID_HEADER) ?? "n/a";
  logLine("info", "http", {
    msg: "outbox.pull",
    requestId: pullRequestId,
    status: res.status,
    durationMs: Date.now() - pullStartedAt,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`outbox pull failed (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as ApiOk<{ events: OutboxEvent[]; nextCursor: string | null }> | ApiError;
  if (!payload || payload.ok !== true) {
    const errorMessage = payload && payload.ok === false ? payload.error.message : "invalid response";
    throw new Error(`outbox pull failed: ${errorMessage}`);
  }

  const data = payload.data;
  const requestId = payload.requestId ?? pullRequestId;

  if (!Array.isArray(data.events) || data.events.length === 0) {
    const next = data.nextCursor ?? cursor;
    if (next && next !== cursor) saveCursor(next);
    updateHealth({ outboundAt: new Date().toISOString() });
    return { processed: 0, total: 0, nextCursor: next };
  }

  const now = Date.now();
  pruneMap(eventDedupe, now);
  const ackIds: string[] = [];
  let processed = 0;
  let allOk = true;

  for (const event of data.events) {
    if (eventDedupe.get(event.id)) {
      ackIds.push(event.id);
      healthState.skipped += 1;
      continue;
    }
    const startedAt = Date.now();
    eventDedupe.set(event.id, now + dedupeTtlMs);

    try {
      if (!handledEventTypes.has(event.type)) {
        logLine("warn", "outbox", {
          msg: "event.skip",
          requestId,
          eventId: event.id,
          type: event.type,
          reason: "unsupported_type",
        });
        ackIds.push(event.id);
        processed += 1;
        healthState.skipped += 1;
        continue;
      }

      const messageText = buildMessageForEvent(event);
      if (!messageText) {
        logLine("warn", "outbox", {
          msg: "event.skip",
          requestId,
          eventId: event.id,
          type: event.type,
          reason: "missing_payload",
        });
        ackIds.push(event.id);
        processed += 1;
        healthState.skipped += 1;
        continue;
      }

      const userIds = await resolveRecipientsForEvent(event);
      if (userIds.length === 0) {
        logLine("warn", "outbox", {
          msg: "event.skip",
          requestId,
          eventId: event.id,
          type: event.type,
          reason: "no_recipients",
        });
        ackIds.push(event.id);
        processed += 1;
        healthState.skipped += 1;
        continue;
      }

      const recipients = await resolveChatIds(userIds);
      if (recipients.length === 0) {
        logLine("warn", "outbox", {
          msg: "event.skip",
          requestId,
          eventId: event.id,
          type: event.type,
          reason: "no_chat",
        });
        ackIds.push(event.id);
        processed += 1;
        healthState.skipped += 1;
        continue;
      }

      for (const recipient of recipients) {
        await sendTelegramMessage(recipient.chatId, messageText);
        logLine("info", "outbox", {
          msg: "event.sent",
          requestId,
          eventId: event.id,
          type: event.type,
          chatId: maskId(recipient.chatId),
          durationMs: Date.now() - startedAt,
          attempt: 1,
        });
        healthState.sent += 1;
      }
      healthState.processed += 1;
      ackIds.push(event.id);
      processed += 1;
    } catch (error) {
      allOk = false;
      healthState.errors += 1;
      updateHealth({ lastErrorAt: new Date().toISOString() });
      logLine("error", "outbox", {
        msg: "event.error",
        requestId,
        eventId: event.id,
        type: event.type,
        error: String(error),
      });
    }
  }

  if (ackIds.length) {
    const ackStartedAt = Date.now();
    const ackRes = await fetchWithRetry(
      new URL("/api/outbox/ack", baseUrl),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${outboxSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: ackIds }),
      },
      { label: "outbox ack", attempts: Math.min(maxRetries, 5), baseDelayMs: 700, maxDelayMs: 7000 },
    );
    const ackRequestId = ackRes.headers.get(REQUEST_ID_HEADER) ?? "n/a";
    logLine("info", "http", {
      msg: "outbox.ack",
      requestId: ackRequestId,
      status: ackRes.status,
      durationMs: Date.now() - ackStartedAt,
      count: ackIds.length,
    });
    healthState.acked += ackIds.length;
    if (!ackRes.ok) {
      const text = await ackRes.text();
      throw new Error(`ack failed (${ackRes.status}): ${text}`);
    }
  }

  if (allOk && data.nextCursor) saveCursor(data.nextCursor);
  updateHealth({ lastSuccessAt: new Date().toISOString() });

  return { processed, total: data.events.length, nextCursor: data.nextCursor };
}

async function runOnce() {
  const updates = await pollUpdatesOnce();
  const outbox = await processOutboxOnce();
  logLine("info", "worker", {
    msg: "once",
    updates,
    outboxProcessed: outbox.processed,
    outboxTotal: outbox.total,
  });
}

async function runWatch() {
  logLine("info", "worker", { msg: "started", baseUrl });
  logLine("info", "worker", { msg: "watch", longPollTimeout, intervalMs });

  const inboundLoop = (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await pollUpdatesOnce();
      } catch (error) {
        healthState.errors += 1;
        updateHealth({ lastErrorAt: new Date().toISOString() });
        logLine("error", "inbound", { msg: "error", error: String(error) });
        await sleep(1000);
      }
    }
  })();

  const outboundLoop = (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const result = await processOutboxOnce();
        if (result.processed > 0) {
          logLine("info", "outbox", {
            msg: "batch",
            processed: result.processed,
            total: result.total,
          });
        }
      } catch (error) {
        healthState.errors += 1;
        updateHealth({ lastErrorAt: new Date().toISOString() });
        logLine("error", "outbox", { msg: "error", error: String(error) });
      }
      await sleep(intervalMs);
    }
  })();

  await Promise.all([inboundLoop, outboundLoop]);
}

async function run() {
  await ensureServerAvailable();
  if (printHealth) {
    console.log(JSON.stringify(healthState));
    return;
  }
  if (once || !watch) {
    await runOnce();
    return;
  }
  await runWatch();
}

run().catch((error) => {
  healthState.errors += 1;
  updateHealth({ lastErrorAt: new Date().toISOString() });
  logLine("error", "worker", { msg: "fatal", error: String(error) });
  process.exit(1);
});
