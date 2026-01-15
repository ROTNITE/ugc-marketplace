import { PrismaClient } from "@prisma/client";
import { requireServerEnv } from "@/lib/env";

const { databaseUrl } = requireServerEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.PRISMA_LOG_LEVEL ? ["query", "info", "warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
