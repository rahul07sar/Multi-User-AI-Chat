-- AlterTable
ALTER TABLE "ChatUser" ADD COLUMN     "isTyping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "typingAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ChatUser_roomId_lastSeenAt_idx" ON "ChatUser"("roomId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "ChatUser_roomId_isTyping_idx" ON "ChatUser"("roomId", "isTyping");
