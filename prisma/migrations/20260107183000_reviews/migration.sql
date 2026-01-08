-- CreateIndex
CREATE UNIQUE INDEX "Review_jobId_fromUserId_key" ON "Review"("jobId", "fromUserId");

