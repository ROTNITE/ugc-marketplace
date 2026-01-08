-- CreateEnum
CREATE TYPE "DisputeMessageKind" AS ENUM ('MESSAGE', 'EVIDENCE_LINK', 'ADMIN_NOTE');

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" UUID NOT NULL,
    "disputeId" TEXT NOT NULL,
    "authorUserId" UUID NOT NULL,
    "authorRole" "Role" NOT NULL,
    "kind" "DisputeMessageKind" NOT NULL,
    "text" TEXT,
    "links" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_createdAt_idx" ON "DisputeMessage"("disputeId", "createdAt");

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
