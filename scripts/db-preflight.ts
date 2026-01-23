import { readFileSync } from "node:fs";
import { Socket } from "node:net";

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

function parseDatabaseUrl(raw?: string) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const port = url.port ? Number(url.port) : 5432;
    return {
      host: url.hostname,
      port: Number.isFinite(port) ? port : 5432,
    };
  } catch {
    return null;
  }
}

function fail(message: string, details?: string) {
  console.error("[db-preflight]", message);
  if (details) console.error(details);
  console.error("Подсказки:");
  console.error("- Запустите Docker Desktop (если используете docker-compose).");
  console.error("- Выполните: npm run db:up");
  console.error("- Проверьте DATABASE_URL в .env");
  process.exit(1);
}

async function checkTcp(host: string, port: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = new Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("timeout"));
    }, 2500);

    socket.once("error", (err) => {
      clearTimeout(timeout);
      socket.destroy();
      reject(err);
    });
    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
  });
}

async function main() {
  loadEnvFile();
  const rawUrl = process.env.DATABASE_URL;
  const parsed = parseDatabaseUrl(rawUrl);
  if (!parsed) {
    fail("DATABASE_URL не задан или некорректен.", `Текущее значение: ${rawUrl ?? "undefined"}`);
    return;
  }

  try {
    await checkTcp(parsed.host, parsed.port);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    fail(`Postgres недоступен по адресу ${parsed.host}:${parsed.port}.`, `Причина: ${reason}`);
  }
}

main();
