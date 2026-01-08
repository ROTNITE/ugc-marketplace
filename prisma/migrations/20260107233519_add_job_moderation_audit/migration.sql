-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedByUserId" UUID;

-- CreateIndex
CREATE INDEX "Job_moderationStatus_moderatedAt_idx" ON "Job"("moderationStatus", "moderatedAt");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
