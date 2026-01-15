import { Prisma, PrismaClient } from "@prisma/client";
import { requireServerEnv } from "@/lib/env";

const { databaseUrl } = requireServerEnv();

type PrismaWithQuery = PrismaClient<Prisma.PrismaClientOptions, "query">;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaWithQuery;
  prismaQueryLogging?: boolean;
};

const log: Prisma.LogDefinition[] = [
  { emit: "event", level: "query" },
  { emit: "stdout", level: "warn" },
  { emit: "stdout", level: "error" },
];

if (process.env.PRISMA_LOG_LEVEL) {
  log.push({ emit: "stdout", level: "query" }, { emit: "stdout", level: "info" });
}

export const prisma: PrismaWithQuery =
  globalForPrisma.prisma ??
  new PrismaClient<Prisma.PrismaClientOptions, "query">({
    datasources: { db: { url: databaseUrl } },
    log,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (process.env.PRISMA_QUERY_LOG === "1" && !globalForPrisma.prismaQueryLogging) {
  globalForPrisma.prismaQueryLogging = true;
  prisma.$on("query", (event) => {
    const target = event.target ?? "db";
    console.info(`[prisma] ${target} ${event.duration}ms`);
  });
}
