-- Add JobStatus value
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

-- Add LedgerEntryType value
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'ESCROW_REFUNDED';

-- Add cancel reason to Job
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
