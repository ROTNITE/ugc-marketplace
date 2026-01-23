import { Prisma } from "@prisma/client";

export function isDbUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("can't reach database server") ||
      message.includes("can't reach database") ||
      message.includes("connection refused") ||
      message.includes("econnrefused") ||
      message.includes("does not exist") ||
      message.includes("timeout")
    );
  }
  return false;
}

export function shouldDegradeDbErrors() {
  return process.env.NODE_ENV === "development";
}
