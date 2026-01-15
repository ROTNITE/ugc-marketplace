import { URL } from "node:url";

const missingDatabaseUrlMessage =
  "DATABASE_URL не задан. Создай .env (см. .env.example) и запусти: npm run db:up";

export function requireServerEnv() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.error(missingDatabaseUrlMessage);
    }
    throw new Error(missingDatabaseUrlMessage);
  }

  let resolvedDatabaseUrl = databaseUrl;
  try {
    const url = new URL(databaseUrl);
    const overrideHost = process.env.POSTGRES_HOST;
    if (overrideHost) {
      url.hostname = overrideHost;
      resolvedDatabaseUrl = url.toString();
    }
  } catch {
    resolvedDatabaseUrl = databaseUrl;
  }

  return {
    databaseUrl: resolvedDatabaseUrl,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
  };
}
