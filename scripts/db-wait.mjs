import { readFileSync } from "node:fs";
import net from "node:net";
import { URL } from "node:url";

const missingDatabaseUrlMessage =
  "DATABASE_URL не задан. Создай .env (см. .env.example) и запусти: npm run db:up";

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
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env is optional; ignore if missing.
  }
}

function resolveHostPort() {
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(missingDatabaseUrlMessage);
    process.exit(1);
  }

  let host = "localhost";
  let port = 5432;

  try {
    const url = new URL(databaseUrl);
    host = url.hostname || host;
    port = url.port ? Number.parseInt(url.port, 10) : port;
  } catch {
    // ignore malformed URL, fallback to defaults
  }

  if (process.env.POSTGRES_HOST) host = process.env.POSTGRES_HOST;
  if (process.env.POSTGRES_PORT) {
    const parsed = Number.parseInt(process.env.POSTGRES_PORT, 10);
    if (Number.isFinite(parsed)) port = parsed;
  }

  return { host, port };
}

const { host, port } = resolveHostPort();
const timeoutMs = 30000;
const start = Date.now();

function attempt() {
  const socket = net.connect({ host, port });

  socket.setTimeout(1000);

  socket.on("connect", () => {
    socket.end();
    process.exit(0);
  });

  const retry = () => {
    socket.destroy();
    if (Date.now() - start > timeoutMs) {
      console.error(`Postgres не доступен на ${host}:${port}.`);
      process.exit(1);
    }
    setTimeout(attempt, 1000);
  };

  socket.on("error", retry);
  socket.on("timeout", retry);
}

attempt();
