-- CreateTable
CREATE TABLE "SavedJobAlert" (
    "id" UUID NOT NULL,
    "creatorProfileId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "platform" "Platform",
    "niche" "Niche",
    "lang" TEXT,
    "minBudgetCents" INTEGER,
    "maxBudgetCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedJobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedJobAlertHit" (
    "id" UUID NOT NULL,
    "alertId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJobAlertHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedJobAlert_creatorProfileId_idx" ON "SavedJobAlert"("creatorProfileId");

-- CreateIndex
CREATE INDEX "SavedJobAlert_isActive_idx" ON "SavedJobAlert"("isActive");

-- CreateIndex
CREATE INDEX "SavedJobAlert_createdAt_idx" ON "SavedJobAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedJobAlertHit_alertId_jobId_key" ON "SavedJobAlertHit"("alertId", "jobId");

-- CreateIndex
CREATE INDEX "SavedJobAlertHit_jobId_idx" ON "SavedJobAlertHit"("jobId");

-- CreateIndex
CREATE INDEX "SavedJobAlertHit_createdAt_idx" ON "SavedJobAlertHit"("createdAt");

-- AddForeignKey
ALTER TABLE "SavedJobAlert" ADD CONSTRAINT "SavedJobAlert_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJobAlertHit" ADD CONSTRAINT "SavedJobAlertHit_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "SavedJobAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedJobAlertHit" ADD CONSTRAINT "SavedJobAlertHit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
