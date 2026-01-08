import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { URL } from "node:url";

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

function resolveDatabaseUrl() {
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL не задан. Создай .env (см. .env.example) и запусти: npm run db:up",
    );
    process.exit(1);
  }

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

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Не передана команда для выполнения.");
  process.exit(1);
}

function resolveCommand(value) {
  if (value.includes("/") || value.includes("\\")) return value;
  const binName = process.platform === "win32" ? `${value}.cmd` : value;
  const localBin = resolve("node_modules", ".bin", binName);
  return existsSync(localBin) ? localBin : value;
}

const env = { ...process.env, DATABASE_URL: resolveDatabaseUrl() };
const result = spawnSync(resolveCommand(command), args, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (typeof result.status === "number") process.exit(result.status);
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
