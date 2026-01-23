-- Ensure existing NULL references are filled with deterministic values
UPDATE "LedgerEntry"
SET "reference" = 'LEGACY:' || "id"
WHERE "reference" IS NULL;

-- Enforce NOT NULL and keep uniqueness on reference
ALTER TABLE "LedgerEntry"
ALTER COLUMN "reference" SET NOT NULL;
