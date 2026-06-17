/**
 * Invite service.
 *
 * Encapsulates collaboration invite creation and lookup for shared
 * conversations.
 */

import { db } from "@/lib/db";
import {
  createInviteToken,
  hashInviteToken,
} from "@/server/security/invite-token";

const INVITE_EXPIRY_MINUTES = 30;

function createInviteExpiryDate() {
  return new Date(Date.now() + INVITE_EXPIRY_MINUTES * 60 * 1000);
}

export async function createConversationInvite(roomId: string) {
  const token = createInviteToken();
  const tokenHash = hashInviteToken(token);

  const invite = await db.chatInvite.create({
    data: {
      roomId,
      tokenHash,
      expiresAt: createInviteExpiryDate(),
    },
  });

  return {
    id: invite.id,
    roomId: invite.roomId,
    token,
    expiresAt: invite.expiresAt,
  };
}

export async function findValidInviteByToken(token: string) {
  const tokenHash = hashInviteToken(token);

  return db.chatInvite.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      room: true,
    },
  });
}

export async function markInviteUsed(inviteId: string) {
  return db.chatInvite.update({
    where: {
      id: inviteId,
    },
    data: {
      usedAt: new Date(),
    },
  });
}

export async function consumeConversationInvite(token: string) {
  const invite = await findValidInviteByToken(token);

  if (!invite) {
    return null;
  }

  await markInviteUsed(invite.id);

  return {
    id: invite.id,
    roomId: invite.roomId,
    room: invite.room,
  };
}