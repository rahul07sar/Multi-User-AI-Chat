/**
 * Room service.
 *
 * Encapsulates conversation room creation, lookup, and participant joining
 * while keeping the current ChatRoom persistence model stable.
 */

import { db } from "@/lib/db";
import {
  buildPasscodeLookup,
  hashPasscode,
  hashPasscodeLegacy,
  verifyPasscode,
} from "@/server/security/passcode";

const DEFAULT_CONVERSATION_NAME = "Product conversation";

function normalizeParticipantName(userName: string) {
  return userName.trim();
}

function normalizeConversationName(roomName?: string) {
  return roomName?.trim() || DEFAULT_CONVERSATION_NAME;
}

export async function createRoom(passcode: string, roomName?: string) {
  return db.chatRoom.create({
    data: {
      passcode: buildPasscodeLookup(passcode),
      passcodeHash: await hashPasscode(passcode),
      name: normalizeConversationName(roomName),
    },
  });
}

export async function findRoomByPasscode(passcode: string) {
  const room = await db.chatRoom.findFirst({
    where: {
      OR: [
        {
          passcode: buildPasscodeLookup(passcode),
        },
        {
          passcode: hashPasscodeLegacy(passcode),
        },
      ],
    },
  });

  if (!room) {
    return null;
  }

  const isValidPasscode = await verifyPasscode(
    passcode,
    room.passcodeHash ?? room.passcode
  );

  return isValidPasscode ? room : null;
}

export async function joinRoom(roomId: string, userName: string) {
  const participantName = normalizeParticipantName(userName);

  return db.chatUser.upsert({
    where: {
      name_roomId: {
        name: participantName,
        roomId,
      },
    },
    update: {},
    create: {
      name: participantName,
      roomId,
    },
  });
}

export async function findRoomUserById(roomId: string, userId: string) {
  return db.chatUser.findFirst({
    where: {
      id: userId,
      roomId,
    },
  });
}

const ACTIVE_PARTICIPANT_WINDOW_MS = 45_000;
const TYPING_WINDOW_MS = 8_000;

export async function updateParticipantPresence(
  roomId: string,
  userId: string
) {
  return db.chatUser.updateMany({
    where: {
      id: userId,
      roomId,
    },
    data: {
      lastSeenAt: new Date(),
    },
  });
}

export async function updateParticipantTypingState(
  roomId: string,
  userId: string,
  isTyping: boolean
) {
  return db.chatUser.updateMany({
    where: {
      id: userId,
      roomId,
    },
    data: {
      isTyping,
      typingAt: isTyping ? new Date() : null,
      lastSeenAt: new Date(),
    },
  });
}

export async function getActiveParticipants(roomId: string) {
  const activeSince = new Date(Date.now() - ACTIVE_PARTICIPANT_WINDOW_MS);
  const typingSince = new Date(Date.now() - TYPING_WINDOW_MS);

  const users = await db.chatUser.findMany({
    where: {
      roomId,
      lastSeenAt: {
        gte: activeSince,
      },
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      isTyping: true,
      typingAt: true,
      lastSeenAt: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    isTyping:
      user.isTyping &&
      Boolean(user.typingAt) &&
      user.typingAt !== null && user.typingAt >= typingSince,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
  }));
}