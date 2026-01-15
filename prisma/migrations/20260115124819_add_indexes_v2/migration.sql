-- CreateIndex
CREATE INDEX "Application_jobId_status_idx" ON "Application"("jobId", "status");

-- CreateIndex
CREATE INDEX "Application_creatorId_status_idx" ON "Application"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Job_moderationStatus_status_createdAt_idx" ON "Job"("moderationStatus", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_brandId_createdAt_idx" ON "Job"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutRequest_userId_createdAt_idx" ON "PayoutRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_createdAt_idx" ON "PayoutRequest"("status", "createdAt");
