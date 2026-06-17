-- CreateTable
CREATE TABLE "ChatInvite" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatInvite_tokenHash_key" ON "ChatInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ChatInvite_roomId_idx" ON "ChatInvite"("roomId");

-- CreateIndex
CREATE INDEX "ChatInvite_expiresAt_idx" ON "ChatInvite"("expiresAt");

-- AddForeignKey
ALTER TABLE "ChatInvite" ADD CONSTRAINT "ChatInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
