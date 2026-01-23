-- CreateIndex
-- Admin finance: Escrow list ORDER BY createdAt DESC, id DESC
CREATE INDEX "Escrow_createdAt_id_idx" ON "Escrow"("createdAt", "id");

-- CreateIndex
-- Inbox messages: Message list WHERE conversationId ORDER BY createdAt DESC, id DESC
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId", "createdAt", "id");

-- CreateIndex
-- Notifications: Notification list WHERE userId ORDER BY createdAt DESC, id DESC
CREATE INDEX "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id");

-- CreateIndex
-- Admin finance: Wallet list ORDER BY updatedAt DESC, id DESC
CREATE INDEX "Wallet_updatedAt_id_idx" ON "Wallet"("updatedAt", "id");
