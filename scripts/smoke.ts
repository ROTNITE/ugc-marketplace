import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

type CookieJar = Record<string, string>;
function loadEnvFile() {
  try {
    const raw = readFileSync(".env", "utf8");
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
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);
    const overrideHost = process.env.POSTGRES_HOST;
    if (overrideHost) {
      url.hostname = overrideHost;
      return url.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

function getSetCookieValues(headers: Headers) {
  const maybe = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof maybe.getSetCookie === "function") return maybe.getSetCookie();
  const fallback = headers.get("set-cookie");
  return fallback ? [fallback] : [];
}

function mergeCookies(jar: CookieJar, response: Response) {
  const values = getSetCookieValues(response.headers);
  for (const item of values) {
    const part = item.split(";")[0];
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) jar[name] = value;
  }
}

function cookieHeader(jar: CookieJar) {
  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function fetchWithCookies(url: string, options: RequestInit, jar: CookieJar) {
  const headers = new Headers(options.headers);
  const cookie = cookieHeader(jar);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(url, { ...options, headers });
  mergeCookies(jar, response);
  return response;
}

async function expectForbidden(url: string, options: RequestInit, jar: CookieJar) {
  const response = await fetchWithCookies(url, options, jar);
  if (![401, 403, 404].includes(response.status)) {
    const body = await response.text().catch(() => "");
    throw new Error(`Expected forbidden, got ${response.status}: ${body}`);
  }
}

async function expectStatus(
  url: string,
  options: RequestInit,
  jar: CookieJar,
  expected: number[],
) {
  const response = await fetchWithCookies(url, options, jar);
  if (!expected.includes(response.status)) {
    const body = await response.text().catch(() => "");
    throw new Error(`Expected ${expected.join("/")}, got ${response.status}: ${body}`);
  }
}

async function fetchJson<T>(url: string, options: RequestInit, jar?: CookieJar): Promise<T> {
  const response = jar ? await fetchWithCookies(url, options, jar) : await fetch(url, options);
  const text = await response.text();
  const snippet = text.length > 200 ? `${text.slice(0, 200)}...` : text;
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  const requestId = (data as { requestId?: string })?.requestId ?? response.headers.get("x-request-id");
  if (!response.ok) {
    const errorPayload = data as { error?: { code?: string; message?: string } };
    const code = errorPayload?.error?.code ?? "ERROR";
    const message = errorPayload?.error?.message ?? text;
    throw new Error(
      `HTTP ${response.status} ${response.statusText} @ ${url}: ${code} ${message} (requestId=${requestId ?? "n/a"}) ${snippet}`,
    );
  }
  const maybeContract = data as { ok?: boolean; data?: T; error?: { code?: string; message?: string } };
  if (typeof maybeContract?.ok === "boolean") {
    if (!maybeContract.ok) {
      const code = maybeContract.error?.code ?? "ERROR";
      const message = maybeContract.error?.message ?? text;
      throw new Error(`API ${code} @ ${url}: ${message} (requestId=${requestId ?? "n/a"})`);
    }
    return (maybeContract.data ?? ({} as T)) as T;
  }
  return data as T;
}

async function login(baseUrl: string, email: string, password: string) {
  const jar: CookieJar = {};
  const csrf = await fetchJson<{ csrfToken: string }>(`${baseUrl}/api/auth/csrf`, { method: "GET" }, jar);
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email,
    password,
    callbackUrl: baseUrl,
    json: "true",
  });
  await fetchWithCookies(
    `${baseUrl}/api/auth/callback/credentials`,
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body },
    jar,
  );
  return jar;
}

function logStep(message: string) {
  console.log(`[smoke] ${message}`);
}

const E2E_JOB_TITLE = "[E2E] Job for full flow";
const FOREIGN_JOB_TITLE = "[E2E] Foreign job for negative checks";

async function ensureServerAvailable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    throw new Error(
      `Сервер недоступен по адресу ${baseUrl}. Запустите \"npm run dev\" перед \"npm run smoke\".`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureApplyJob(prisma: PrismaClient, brandId: string, creatorId: string) {
  const existing = await prisma.job.findFirst({
    where: {
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
      applications: { none: { creatorId } },
    },
  });

  if (existing) return existing;

  return prisma.job.create({
    data: {
      brandId,
      title: "Smoke apply job",
      description: "Smoke job for apply flow",
      platform: "TIKTOK",
      niche: "FOOD",
      deliverablesCount: 1,
      videoDurationSec: 15,
      contentFormats: ["REVIEW"],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: "BASIC",
      usageTermDays: 30,
      revisionRounds: 1,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: false,
      scriptProvided: false,
      notes: null,
      budgetMin: 1000,
      budgetMax: 1500,
      currency: "RUB",
      deadlineType: "DAYS_3_5",
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
    },
  });
}

async function ensureConversation(prisma: PrismaClient, brandId: string, creatorId: string) {
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: { some: { userId: brandId } },
      AND: { participants: { some: { userId: creatorId } } },
    },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      participants: { create: [{ userId: brandId }, { userId: creatorId }] },
    },
  });
}

async function ensureEscrowJob(prisma: PrismaClient, brandId: string, creatorId: string) {
  const existing = await prisma.job.findFirst({
    where: {
      brandId,
      activeCreatorId: creatorId,
      moderationStatus: "APPROVED",
      escrow: { is: { status: "UNFUNDED" } },
    },
  });

  if (existing) return existing;

  const job = await prisma.job.create({
    data: {
      brandId,
      activeCreatorId: creatorId,
      title: "Smoke escrow job",
      description: "Smoke escrow job for fund flow",
      platform: "TIKTOK",
      niche: "FOOD",
      deliverablesCount: 1,
      videoDurationSec: 15,
      contentFormats: ["REVIEW"],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: "BASIC",
      usageTermDays: 30,
      revisionRounds: 1,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: false,
      scriptProvided: false,
      notes: null,
      budgetMin: 1000,
      budgetMax: 1500,
      currency: "RUB",
      deadlineType: "DAYS_3_5",
      status: "PAUSED",
      moderationStatus: "APPROVED",
    },
  });

  await prisma.escrow.create({
    data: {
      jobId: job.id,
      brandId,
      creatorId,
      amountCents: 10000,
      currency: "RUB",
      status: "UNFUNDED",
    },
  });

  return job;
}

async function ensureReviewJob(prisma: PrismaClient, brandId: string, creatorId: string) {
  const existing = await prisma.job.findFirst({
    where: {
      brandId,
      activeCreatorId: creatorId,
      status: "IN_REVIEW",
      moderationStatus: "APPROVED",
      submissions: { some: { status: "SUBMITTED" } },
    },
    select: { id: true },
  });

  if (existing) return existing;

  const job = await prisma.job.create({
    data: {
      brandId,
      activeCreatorId: creatorId,
      title: "Smoke review job",
      description: "Smoke review job for approve flow",
      platform: "TIKTOK",
      niche: "FOOD",
      deliverablesCount: 1,
      videoDurationSec: 15,
      contentFormats: ["REVIEW"],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: "BASIC",
      usageTermDays: 30,
      revisionRounds: 1,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: false,
      scriptProvided: false,
      notes: null,
      budgetMin: 1000,
      budgetMax: 1500,
      currency: "RUB",
      deadlineType: "DAYS_3_5",
      status: "IN_REVIEW",
      moderationStatus: "APPROVED",
    },
    select: { id: true },
  });

  await prisma.submission.create({
    data: {
      jobId: job.id,
      creatorId,
      version: 1,
      status: "SUBMITTED",
      note: "Smoke submission",
    },
  });

  return job;
}

async function ensureForeignBrand(prisma: PrismaClient) {
  return prisma.user.upsert({
    where: { email: "foreign-brand@example.com" },
    update: { role: "BRAND", name: "Foreign Brand" },
    create: {
      email: "foreign-brand@example.com",
      name: "Foreign Brand",
      passwordHash: "smoke",
      role: "BRAND",
    },
    select: { id: true, email: true },
  });
}

async function ensureForeignJob(prisma: PrismaClient, brandId: string) {
  const existing = await prisma.job.findFirst({
    where: { brandId },
  });

  if (existing) return existing;

  return prisma.job.create({
    data: {
      brandId,
      title: "Smoke чужой заказ",
      description: "Чужой заказ для негативных проверок",
      platform: "TIKTOK",
      niche: "FOOD",
      deliverablesCount: 1,
      videoDurationSec: 15,
      contentFormats: ["REVIEW"],
      needsPosting: false,
      needsWhitelisting: false,
      rightsPackage: "BASIC",
      usageTermDays: 30,
      revisionRounds: 1,
      revisionRoundsIncluded: 1,
      languages: ["ru"],
      shippingRequired: false,
      deliverablesIncludeRaw: false,
      deliverablesIncludeProjectFile: false,
      subtitlesRequired: false,
      scriptProvided: false,
      notes: null,
      budgetMin: 1000,
      budgetMax: 1500,
      currency: "RUB",
      deadlineType: "DAYS_3_5",
      status: "PUBLISHED",
      moderationStatus: "APPROVED",
    },
  });
}

async function ensureBrandProfileComplete(prisma: PrismaClient, userId: string) {
  await prisma.brandProfile.upsert({
    where: { userId },
    update: {
      companyName: "Smoke Brand",
      website: "https://example.com",
      description: "Smoke brand profile description for publish flow.",
    },
    create: {
      userId,
      companyName: "Smoke Brand",
      website: "https://example.com",
      description: "Smoke brand profile description for publish flow.",
    },
  });
}

async function ensureWalletBalance(prisma: PrismaClient, userId: string, amountCents: number) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    await prisma.wallet.create({
      data: { userId, balanceCents: amountCents, currency: "RUB" },
    });
    return;
  }
  if (wallet.balanceCents < amountCents) {
    await prisma.wallet.update({
      where: { userId },
      data: { balanceCents: amountCents },
    });
  }
}

async function run() {
  loadEnvFile();
  const databaseUrl = resolveDatabaseUrl();
  if (databaseUrl) process.env.DATABASE_URL = databaseUrl;

  const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
  const outboxSecret = process.env.OUTBOX_CONSUMER_SECRET;

  const brandEmail = process.env.SMOKE_BRAND_EMAIL ?? "brand@example.com";
  const brandPassword = process.env.SMOKE_BRAND_PASSWORD ?? "password123";
  const brandBEmail = process.env.SMOKE_BRAND_B_EMAIL ?? "brand-b@example.com";
  const brandBPassword = process.env.SMOKE_BRAND_B_PASSWORD ?? "password123";
  const creatorEmail = process.env.SMOKE_CREATOR_EMAIL ?? "creator@example.com";
  const creatorPassword = process.env.SMOKE_CREATOR_PASSWORD ?? "password123";
  const creatorBEmail = process.env.SMOKE_CREATOR_B_EMAIL ?? "creator-b@example.com";
  const creatorBPassword = process.env.SMOKE_CREATOR_B_PASSWORD ?? "password123";
  const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? "password123";
  const payoutAmountCents = Number(process.env.SMOKE_PAYOUT_AMOUNT_CENTS ?? 1000);

  const prisma = new PrismaClient();
  let authzOk = false;
  let moneyFlowOk = false;
  let retriesOk = false;

  try {
    await ensureServerAvailable(baseUrl);
    logStep("login brand/creator/admin/brandB/creatorB");
    const [brandJar, creatorJar, adminJar, brandBJar, creatorBJar] = await Promise.all([
      login(baseUrl, brandEmail, brandPassword),
      login(baseUrl, creatorEmail, creatorPassword),
      login(baseUrl, adminEmail, adminPassword),
      login(baseUrl, brandBEmail, brandBPassword),
      login(baseUrl, creatorBEmail, creatorBPassword),
    ]);

    logStep("public jobs list");
    await fetchJson(`${baseUrl}/api/jobs`, { method: "GET" });

    const brand = await prisma.user.findUnique({ where: { email: brandEmail } });
    const creator = await prisma.user.findUnique({ where: { email: creatorEmail } });
    const brandB = await prisma.user.findUnique({ where: { email: brandBEmail } });
    const creatorB = await prisma.user.findUnique({ where: { email: creatorBEmail } });

    if (!brand || !creator || !brandB || !creatorB) {
      throw new Error("Seed users not found. Run db:seed.");
    }

    await ensureBrandProfileComplete(prisma, brand.id);

    const e2eJob = await prisma.job.findFirst({
      where: { brandId: brand.id, title: E2E_JOB_TITLE },
      select: { id: true, status: true, moderationStatus: true, activeCreatorId: true },
    });
    if (!e2eJob) {
      throw new Error(`Seed job not found: ${E2E_JOB_TITLE}`);
    }
    if (e2eJob.status !== "PUBLISHED" || e2eJob.moderationStatus !== "APPROVED") {
      throw new Error("Seed job is not in PUBLISHED/APPROVED state.");
    }

    const foreignJob = await prisma.job.findFirst({
      where: { brandId: brandB.id, title: FOREIGN_JOB_TITLE },
      select: { id: true },
    });
    if (!foreignJob) {
      throw new Error(`Seed job not found: ${FOREIGN_JOB_TITLE}`);
    }

    await prisma.application.deleteMany({
      where: { jobId: e2eJob.id, creatorId: creator.id },
    });

    logStep("creator apply (E2E job)");
    const application = await fetchJson<{ application: { id: string } }>(
      `${baseUrl}/api/jobs/${e2eJob.id}/apply`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "E2E apply", priceQuote: 4500 }),
      },
      creatorJar,
    );

    logStep("authz: brand cannot apply to job");
    await expectForbidden(
      `${baseUrl}/api/jobs/${e2eJob.id}/apply`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Nope" }) },
      brandJar,
    );

    logStep("authz: creator cannot accept отклик");
    await expectForbidden(
      `${baseUrl}/api/jobs/${e2eJob.id}/applications/${application.application.id}/accept`,
      { method: "POST" },
      creatorJar,
    );

    logStep("brand accept application");
    const acceptance = await fetchJson<{ conversationId: string }>(
      `${baseUrl}/api/jobs/${e2eJob.id}/applications/${application.application.id}/accept`,
      { method: "POST" },
      brandJar,
    );

    const jobAfterAccept = await prisma.job.findUnique({
      where: { id: e2eJob.id },
      select: { status: true, activeCreatorId: true },
    });
    if (!jobAfterAccept || jobAfterAccept.status !== "PAUSED" || jobAfterAccept.activeCreatorId !== creator.id) {
      throw new Error("Accept flow failed: job status not PAUSED or creator not assigned.");
    }

    const escrow = await prisma.escrow.findUnique({
      where: { jobId: e2eJob.id },
      select: { id: true, status: true, amountCents: true },
    });
    if (!escrow || escrow.status !== "UNFUNDED") {
      throw new Error("Escrow not created or not UNFUNDED after accept.");
    }

    logStep("authz: brand cannot cancel чужой заказ");
    await expectForbidden(
      `${baseUrl}/api/jobs/${foreignJob.id}/cancel`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "Smoke" }) },
      brandJar,
    );

    logStep("authz: brandB cannot cancel чужой заказ");
    await expectForbidden(
      `${baseUrl}/api/jobs/${e2eJob.id}/cancel`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "Smoke" }) },
      brandBJar,
    );

    logStep("authz: creatorB cannot withdraw чужой отклик");
    await expectForbidden(
      `${baseUrl}/api/applications/${application.application.id}/withdraw`,
      { method: "POST" },
      creatorBJar,
    );

    logStep("authz: creator cannot fund escrow");
    await expectForbidden(`${baseUrl}/api/escrow/${e2eJob.id}/fund`, { method: "POST" }, creatorJar);

    logStep("authz: creator cannot submit to чужой заказ");
    await expectForbidden(
      `${baseUrl}/api/jobs/${foreignJob.id}/submissions`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ type: "FINAL_VIDEO", url: "https://example.com/foreign" }] }) },
      creatorJar,
    );

    logStep("authz: admin cannot post in чужой чат");
    await expectForbidden(
      `${baseUrl}/api/conversations/${acceptance.conversationId}/messages`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "Admin probe" }) },
      adminJar,
    );
    authzOk = true;

    logStep("escrow fund");
    await fetchJson(`${baseUrl}/api/escrow/${e2eJob.id}/fund`, { method: "POST" }, brandJar);
    const escrowFunded = await prisma.escrow.findUnique({
      where: { id: escrow.id },
      select: { status: true },
    });
    if (!escrowFunded || escrowFunded.status !== "FUNDED") {
      throw new Error("Escrow was not funded.");
    }
    const fundEntries = await prisma.ledgerEntry.count({ where: { reference: `ESCROW_FUND:${escrow.id}` } });
    if (fundEntries !== 1) {
      throw new Error("ESCROW_FUND ledger entry duplicated.");
    }

    logStep("escrow fund (idempotent)");
    await fetchJson(`${baseUrl}/api/escrow/${e2eJob.id}/fund`, { method: "POST" }, brandJar);
    const fundEntriesAfter = await prisma.ledgerEntry.count({ where: { reference: `ESCROW_FUND:${escrow.id}` } });
    if (fundEntriesAfter !== 1) {
      throw new Error("ESCROW_FUND ledger entry duplicated after retry.");
    }

    logStep("creator submit work");
    await fetchJson(
      `${baseUrl}/api/jobs/${e2eJob.id}/submissions`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note: "E2E submission",
          items: [{ type: "FINAL_VIDEO", url: "https://example.com/final-video" }],
        }),
      },
      creatorJar,
    );

    const submission = await prisma.submission.findFirst({
      where: { jobId: e2eJob.id },
      orderBy: { version: "desc" },
      select: { status: true },
    });
    if (!submission || submission.status !== "SUBMITTED") {
      throw new Error("Submission was not created in SUBMITTED state.");
    }

    const jobAfterSubmit = await prisma.job.findUnique({
      where: { id: e2eJob.id },
      select: { status: true },
    });
    if (!jobAfterSubmit || jobAfterSubmit.status !== "IN_REVIEW") {
      throw new Error("Job did not переходить в IN_REVIEW после сдачи.");
    }

    logStep("brand approve submission");
    await fetchJson(`${baseUrl}/api/jobs/${e2eJob.id}/review/approve`, { method: "POST" }, brandJar);

    const jobAfterApprove = await prisma.job.findUnique({
      where: { id: e2eJob.id },
      select: { status: true },
    });
    if (!jobAfterApprove || jobAfterApprove.status !== "COMPLETED") {
      throw new Error("Job did not переходить в COMPLETED после approve.");
    }

    const escrowReleased = await prisma.escrow.findUnique({
      where: { id: escrow.id },
      select: { status: true },
    });
    if (!escrowReleased || escrowReleased.status !== "RELEASED") {
      throw new Error("Escrow was not released.");
    }

    const releaseEntries = await prisma.ledgerEntry.count({ where: { reference: `ESCROW_RELEASE:${escrow.id}` } });
    if (releaseEntries !== 1) {
      throw new Error("ESCROW_RELEASE ledger entry duplicated.");
    }

    logStep("review approve (idempotent)");
    await fetchJson(`${baseUrl}/api/jobs/${e2eJob.id}/review/approve`, { method: "POST" }, brandJar);
    const releaseEntriesAfter = await prisma.ledgerEntry.count({
      where: { reference: `ESCROW_RELEASE:${escrow.id}` },
    });
    if (releaseEntriesAfter !== 1) {
      throw new Error("ESCROW_RELEASE ledger entry duplicated after retry.");
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: creator.id },
      select: { balanceCents: true },
    });
    if (!wallet || wallet.balanceCents <= 0) {
      throw new Error("Creator wallet balance is empty after release.");
    }
    const payoutAmount = Math.min(wallet.balanceCents, payoutAmountCents);

    logStep("authz: brand cannot request payout");
    await expectForbidden(
      `${baseUrl}/api/payouts/request`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents: payoutAmount, payoutMethod: "Smoke payout" }),
      },
      brandJar,
    );

    logStep("creator payout request");
    const payout = await fetchJson<{ payout: { id: string } }>(
      `${baseUrl}/api/payouts/request`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents: payoutAmount, payoutMethod: "Smoke payout" }),
      },
      creatorJar,
    );

    const payoutPending = await prisma.payoutRequest.findUnique({
      where: { id: payout.payout.id },
      select: { status: true },
    });
    if (!payoutPending || payoutPending.status !== "PENDING") {
      throw new Error("Payout request did not переходить в PENDING.");
    }

    logStep("authz: brand cannot approve payout");
    await expectForbidden(
      `${baseUrl}/api/admin/payouts/${payout.payout.id}/approve`,
      { method: "POST" },
      brandJar,
    );

    logStep("admin approve payout");
    await fetchJson(
      `${baseUrl}/api/admin/payouts/${payout.payout.id}/approve`,
      { method: "POST" },
      adminJar,
    );

    const payoutApproved = await prisma.payoutRequest.findUnique({
      where: { id: payout.payout.id },
      select: { status: true },
    });
    if (!payoutApproved || payoutApproved.status !== "APPROVED") {
      throw new Error("Payout request did not переходить в APPROVED.");
    }

    const payoutApproveEntries = await prisma.ledgerEntry.count({
      where: { reference: `PAYOUT_APPROVE:${payout.payout.id}` },
    });
    if (payoutApproveEntries !== 1) {
      throw new Error("PAYOUT_APPROVE ledger entry duplicated.");
    }

    logStep("admin approve payout (idempotent)");
    await expectStatus(
      `${baseUrl}/api/admin/payouts/${payout.payout.id}/approve`,
      { method: "POST" },
      adminJar,
      [409],
    );

    const payoutApproveEntriesAfter = await prisma.ledgerEntry.count({
      where: { reference: `PAYOUT_APPROVE:${payout.payout.id}` },
    });
    if (payoutApproveEntriesAfter !== 1) {
      throw new Error("PAYOUT_APPROVE ledger entry duplicated after retry.");
    }
    retriesOk = true;

    logStep("authz: creator cannot approve payout");
    await expectForbidden(
      `${baseUrl}/api/admin/payouts/${payout.payout.id}/approve`,
      { method: "POST" },
      creatorJar,
    );

    logStep("authz: brand cannot withdraw чужой отклик");
    await expectForbidden(
      `${baseUrl}/api/applications/${application.application.id}/withdraw`,
      { method: "POST" },
      brandJar,
    );
    moneyFlowOk = true;

    if (!outboxSecret) {
      logStep("outbox skipped (OUTBOX_CONSUMER_SECRET missing)");
    } else {
      logStep("outbox pull -> ack -> no duplicates");
      const pull = await fetchJson<{ events: Array<{ id: string }>; nextCursor: string | null }>(
        `${baseUrl}/api/outbox/pull?limit=5`,
        { method: "GET", headers: { authorization: `Bearer ${outboxSecret}` } },
      );
      const ids = pull.events.map((item) => item.id);
      if (ids.length) {
        await fetchJson(
          `${baseUrl}/api/outbox/ack`,
          {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${outboxSecret}` },
            body: JSON.stringify({ ids }),
          },
        );
        if (pull.nextCursor) {
          const nextPull = await fetchJson<{ events: Array<{ id: string }> }>(
            `${baseUrl}/api/outbox/pull?limit=5&cursor=${encodeURIComponent(pull.nextCursor)}`,
            { method: "GET", headers: { authorization: `Bearer ${outboxSecret}` } },
          );
          const repeated = nextPull.events.filter((item) => ids.includes(item.id));
          if (repeated.length > 0) {
            throw new Error("Outbox returned already acked events.");
          }
        }
      }
    }

    logStep(
      `summary: moneyFlow=${moneyFlowOk ? "ok" : "fail"}, authz=${authzOk ? "ok" : "fail"}, retries=${retriesOk ? "ok" : "fail"}`,
    );
    logStep("ok");
    void adminJar;
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("[smoke] failed", error);
  process.exit(1);
});
