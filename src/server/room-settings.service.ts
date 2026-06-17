/**
 * Room settings service.
 *
 * Encapsulates conversation room settings retrieval and updates.
 */

import { db } from "@/lib/db";

export type RoomSettingsInput = {
  name?: string;
  description?: string | null;
  isInvitesEnabled?: boolean;
  maxParticipants?: number;
};

export async function getRoomSettings(roomId: string) {
  const room = await db.chatRoom.findUnique({
    where: {
      id: roomId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      isInvitesEnabled: true,
      maxParticipants: true,
      updatedAt: true,
    },
  });

  if (!room) {
    return null;
  }

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    isInvitesEnabled: room.isInvitesEnabled,
    maxParticipants: room.maxParticipants,
    updatedAt: room.updatedAt.toISOString(),
  };
}

export async function updateRoomSettings(
  roomId: string,
  input: RoomSettingsInput
) {
  const room = await db.chatRoom.update({
    where: {
      id: roomId,
    },
    data: {
      name: input.name?.trim(),
      description:
        input.description === undefined ? undefined : input.description?.trim() || null,
      isInvitesEnabled: input.isInvitesEnabled,
      maxParticipants: input.maxParticipants,
    },
    select: {
      id: true,
      name: true,
      description: true,
      isInvitesEnabled: true,
      maxParticipants: true,
      updatedAt: true,
    },
  });

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    isInvitesEnabled: room.isInvitesEnabled,
    maxParticipants: room.maxParticipants,
    updatedAt: room.updatedAt.toISOString(),
  };
}