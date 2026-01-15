-- Add reference column for idempotent ledger entries
ALTER TABLE "LedgerEntry" ADD COLUMN "reference" TEXT;

-- Ensure reference is unique when provided
CREATE UNIQUE INDEX "LedgerEntry_reference_key" ON "LedgerEntry"("reference");
