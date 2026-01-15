import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

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

const updateDedupe = new Map<number, number>();
const eventDedupe = new Map<string, number>();
const dedupeTtlMs = Math.max(Number(process.env.TELEGRAM_DEDUPE_TTL ?? "300000"), 30_000);

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN не задан. Добавьте его в .env.");
  process.exit(1);
}
if (!botSecret) {
  console.error("TELEGRAM_BOT_SECRET не задан. Добавьте его в .env.");
  process.exit(1);
}
if (!outboxSecret) {
  console.error("OUTBOX_CONSUMER_SECRET не задан. Добавьте его в .env.");
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneMap<T>(map: Map<T, number>, now: number) {
  for (const [key, expiresAt] of map.entries()) {
    if (expiresAt <= now) map.delete(key);
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
    throw new Error(json?.description ?? `Telegram API error (${res.status})`);
  }
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

  const data = (await res.json().catch(() => null)) as ApiOk<unknown> | ApiError | null;
  if (!res.ok || !data || data.ok === false) {
    const message = data && "error" in data ? data.error.message : "Не удалось подтвердить привязку.";
    return { ok: false, message, requestId: data?.requestId };
  }
  return { ok: true, requestId: data.requestId };
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
        "Привет! Откройте кабинет → Профиль → Telegram и сгенерируйте код, затем отправьте /bind CODE.",
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
  return json.result.length;
}

function getString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

async function resolveJobSummary(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, brandId: true, activeCreatorId: true },
  });
}

async function resolveConversationRecipients(conversationId: string, senderId: string | null) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { participants: { select: { userId: true } }, job: { select: { title: true } } },
  });

  if (!conversation) return { userIds: [], jobTitle: null };
  const userIds = conversation.participants
    .map((p) => p.userId)
    .filter((id) => id && id !== senderId);
  return { userIds, jobTitle: conversation.job?.title ?? null };
}

function resolveAmount(payload: Record<string, unknown>) {
  const amount = payload.amountCents;
  if (typeof amount !== "number") return null;
  return Math.round(amount / 100);
}

function buildEventTitle(eventType: string) {
  const titles: Record<string, string> = {
    MESSAGE_SENT: "Новое сообщение",
    APPLICATION_CREATED: "Новый отклик",
    APPLICATION_ACCEPTED: "Отклик принят",
    APPLICATION_REJECTED: "Отклик отклонен",
    INVITATION_SENT: "Новое приглашение",
    INVITATION_ACCEPTED: "Приглашение принято",
    INVITATION_DECLINED: "Приглашение отклонено",
    ESCROW_FUNDED: "Эскроу пополнен",
    SUBMISSION_SUBMITTED: "Сданы материалы",
    JOB_COMPLETED: "Заказ завершен",
    JOB_MODERATION_APPROVED: "Заказ одобрен модерацией",
    JOB_MODERATION_REJECTED: "Заказ отклонен модерацией",
    JOB_MODERATION_RESUBMITTED: "Заказ повторно отправлен на модерацию",
    JOB_PUBLISHED: "Заказ опубликован",
    JOB_UPDATED: "Заказ обновлен",
    PAYOUT_REQUESTED: "Заявка на выплату",
    PAYOUT_APPROVED: "Выплата одобрена",
    PAYOUT_REJECTED: "Выплата отклонена",
    PAYOUT_CANCELED: "Заявка на выплату отменена",
    DISPUTE_OPENED: "Открыт спор",
    DISPUTE_MESSAGE_ADDED: "Новое сообщение в споре",
    DISPUTE_RESOLVED_RELEASE: "Спор решен (выплата)",
    DISPUTE_RESOLVED_REFUND: "Спор решен (возврат)",
    CREATOR_VERIFIED: "Креатор подтвержден",
    CREATOR_VERIFICATION_REJECTED: "Верификация отклонена",
    BALANCE_ADJUSTED: "Корректировка баланса",
    JOB_ALERT_MATCHED: "Новый заказ по алерту",
    TELEGRAM_BOUND: "Telegram привязан",
    TELEGRAM_UNBOUND: "Telegram отвязан",
  };
  return titles[eventType] ?? `Событие: ${eventType}`;
}

async function resolveRecipients(event: OutboxEvent) {
  const payload = event.payload ?? {};
  const userIds = new Set<string>();
  let jobTitle: string | null = null;

  const typeRecipients: Record<string, Array<keyof typeof payload>> = {
    APPLICATION_CREATED: ["brandId"],
    APPLICATION_ACCEPTED: ["creatorId"],
    APPLICATION_REJECTED: ["creatorId"],
    INVITATION_SENT: ["creatorId"],
    INVITATION_ACCEPTED: ["brandId"],
    INVITATION_DECLINED: ["brandId"],
    PAYOUT_REQUESTED: ["creatorId"],
    PAYOUT_APPROVED: ["creatorId"],
    PAYOUT_REJECTED: ["creatorId"],
    PAYOUT_CANCELED: ["creatorId"],
    BALANCE_ADJUSTED: ["userId"],
    CREATOR_VERIFIED: ["creatorId"],
    CREATOR_VERIFICATION_REJECTED: ["creatorId"],
    TELEGRAM_BOUND: ["userId"],
    TELEGRAM_UNBOUND: ["userId"],
    JOB_ALERT_MATCHED: ["creatorUserId"],
  };

  if (event.type === "MESSAGE_SENT") {
    const conversationId = getString(payload, "conversationId");
    const senderId = getString(payload, "senderId");
    if (conversationId) {
      const resolved = await resolveConversationRecipients(conversationId, senderId);
      resolved.userIds.forEach((id) => userIds.add(id));
      jobTitle = resolved.jobTitle;
    }
    return { userIds: Array.from(userIds), jobTitle };
  }

  const keys = typeRecipients[event.type];
  if (keys) {
    keys.forEach((key) => {
      const value = getString(payload, String(key));
      if (value) userIds.add(value);
    });
  }

  const jobId = getString(payload, "jobId");
  if (jobId) {
    const job = await resolveJobSummary(jobId);
    if (job?.title) jobTitle = job.title;
    const jobRecipientMode: Record<string, "brand" | "creator" | "both"> = {
      ESCROW_FUNDED: "creator",
      SUBMISSION_SUBMITTED: "brand",
      JOB_COMPLETED: "both",
      JOB_MODERATION_APPROVED: "brand",
      JOB_MODERATION_REJECTED: "brand",
      JOB_MODERATION_RESUBMITTED: "brand",
      JOB_PUBLISHED: "brand",
      JOB_UPDATED: "brand",
      DISPUTE_OPENED: "both",
      DISPUTE_MESSAGE_ADDED: "both",
      DISPUTE_RESOLVED_RELEASE: "both",
      DISPUTE_RESOLVED_REFUND: "both",
    };
    const mode = jobRecipientMode[event.type];
    if (mode === "brand" || mode === "both") {
      if (job?.brandId) userIds.add(job.brandId);
    }
    if (mode === "creator" || mode === "both") {
      if (job?.activeCreatorId) userIds.add(job.activeCreatorId);
    }
  }

  if (userIds.size === 0) {
    const fallbackKeys = ["userId", "creatorId", "brandId", "creatorUserId", "openerUserId"];
    fallbackKeys.forEach((key) => {
      const value = getString(payload, key);
      if (value) userIds.add(value);
    });
  }

  if (event.type === "DISPUTE_OPENED") {
    const opener = getString(payload, "openerUserId");
    if (opener) userIds.delete(opener);
  }

  return { userIds: Array.from(userIds), jobTitle };
}

async function resolveChatIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const accounts = await prisma.telegramAccount.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, telegramUserId: true },
  });
  return accounts.map((acc) => ({ userId: acc.userId, chatId: acc.telegramUserId }));
}

async function buildMessage(event: OutboxEvent, jobTitle: string | null) {
  const title = buildEventTitle(event.type);
  const amount = resolveAmount(event.payload ?? {});
  const parts: string[] = [title];
  if (jobTitle) parts.push(jobTitle);
  if (amount !== null) parts.push(`Сумма: ${amount}`);
  return parts.join("\n");
}

async function processOutboxOnce() {
  const cursor = loadCursor();
  const url = new URL("/api/outbox/pull", baseUrl);
  url.searchParams.set("limit", String(maxBatch));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetchWithRetry(
    url,
    { headers: { Authorization: `Bearer ${outboxSecret}` } },
    { label: "outbox pull" },
  );

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
  const requestId = payload.requestId;

  if (!Array.isArray(data.events) || data.events.length === 0) {
    const next = data.nextCursor ?? cursor;
    if (next && next !== cursor) saveCursor(next);
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
      continue;
    }
    const startedAt = Date.now();
    eventDedupe.set(event.id, now + dedupeTtlMs);

    try {
      const resolved = await resolveRecipients(event);
      const messageText = await buildMessage(event, resolved.jobTitle);
      const recipients = await resolveChatIds(resolved.userIds);
      if (recipients.length === 0) {
        ackIds.push(event.id);
        processed += 1;
      } else {
        for (const recipient of recipients) {
          await sendTelegramMessage(recipient.chatId, messageText);
          console.log(
            `[telegram] requestId=${requestId} eventId=${event.id} type=${event.type} chatId=${maskId(
              recipient.chatId,
            )} durationMs=${Date.now() - startedAt}`,
          );
        }
        ackIds.push(event.id);
        processed += 1;
      }
    } catch (error) {
      allOk = false;
      console.error(
        `[telegram] requestId=${requestId} eventId=${event.id} type=${event.type} error=${String(error)}`,
      );
    }
  }

  if (ackIds.length) {
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
    if (!ackRes.ok) {
      const text = await ackRes.text();
      throw new Error(`ack failed (${ackRes.status}): ${text}`);
    }
  }

  if (allOk && data.nextCursor) saveCursor(data.nextCursor);

  return { processed, total: data.events.length, nextCursor: data.nextCursor };
}

async function runOnce() {
  const updates = await pollUpdatesOnce();
  const outbox = await processOutboxOnce();
  console.log(`Done. Updates ${updates}. Outbox ${outbox.processed}/${outbox.total}.`);
}

async function runWatch() {
  console.log(`Telegram worker started. baseUrl=${baseUrl}`);
  console.log(`Polling updates (timeout ${longPollTimeout}s) and outbox every ${intervalMs}ms...`);

  const inboundLoop = (async () => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await pollUpdatesOnce();
      } catch (error) {
        console.error(`[telegram] inbound error: ${String(error)}`);
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
          console.log(`Outbox processed ${result.processed}/${result.total}.`);
        }
      } catch (error) {
        console.error(`[telegram] outbox error: ${String(error)}`);
      }
      await sleep(intervalMs);
    }
  })();

  await Promise.all([inboundLoop, outboundLoop]);
}

async function run() {
  if (once || !watch) {
    await runOnce();
    return;
  }
  await runWatch();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
