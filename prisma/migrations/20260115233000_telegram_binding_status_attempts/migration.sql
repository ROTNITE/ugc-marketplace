-- CreateEnum
CREATE TYPE "TelegramBindingStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "TelegramBindingRequest"
ADD COLUMN "status" "TelegramBindingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows
UPDATE "TelegramBindingRequest" SET "status" = 'USED' WHERE "usedAt" IS NOT NULL;
UPDATE "TelegramBindingRequest" SET "status" = 'EXPIRED' WHERE "usedAt" IS NULL AND "expiresAt" <= NOW();
