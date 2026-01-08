-- AlterEnum
ALTER TYPE "VerificationStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "verificationReason" TEXT,
ADD COLUMN     "verificationReviewedAt" TIMESTAMP(3),
ADD COLUMN     "verificationReviewedByUserId" UUID;

-- CreateIndex
CREATE INDEX "CreatorProfile_verificationStatus_idx" ON "CreatorProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "CreatorProfile_verificationStatus_verificationReviewedAt_idx" ON "CreatorProfile"("verificationStatus", "verificationReviewedAt");

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_verificationReviewedByUserId_fkey" FOREIGN KEY ("verificationReviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
