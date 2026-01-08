CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "ConversationParticipant" ADD COLUMN "id" UUID;
ALTER TABLE "ConversationParticipant" ADD COLUMN "lastReadAt" TIMESTAMP(3);
ALTER TABLE "ConversationParticipant" ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "ConversationParticipant" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
UPDATE "ConversationParticipant" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

ALTER TABLE "ConversationParticipant" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "ConversationParticipant" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "ConversationParticipant" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ConversationParticipant" ALTER COLUMN "updatedAt" SET DEFAULT NOW();

ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_pkey";
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id");
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_userId_key" UNIQUE ("conversationId", "userId");

CREATE INDEX "ConversationParticipant_userId_lastReadAt_idx" ON "ConversationParticipant"("userId", "lastReadAt");