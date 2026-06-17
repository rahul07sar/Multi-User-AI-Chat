-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isInvitesEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxParticipants" INTEGER NOT NULL DEFAULT 25;
