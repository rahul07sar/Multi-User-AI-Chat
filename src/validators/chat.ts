/**
 * Chat validators.
 *
 * Defines shared Zod schemas for chat, conversation, room, and admin audit APIs.
 */

import { AuditLogLevel } from "@prisma/client";
import { z } from "zod";

export const startConversationSchema = z.object({
  userName: z.string().trim().min(2).max(40),
});

export const createRoomSchema = z.object({
  passcode: z.string().trim().min(4).max(80),
  roomName: z.string().trim().max(100).optional(),
});

export const joinRoomSchema = z.object({
  passcode: z.string().trim().min(4).max(80),
  userName: z.string().trim().min(2).max(40),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

export const getRoomMessagesSchema = z.object({
  roomId: z.string().trim().min(1),
});

export const getAuditLogsSchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  eventType: z.string().trim().min(1).max(100).optional(),
  level: z.nativeEnum(AuditLogLevel).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  outcome: z.string().trim().min(1).max(100).optional(),
  requestId: z.string().trim().min(1).max(100).optional(),
  roomId: z.string().trim().min(1).max(100).optional(),
  userId: z.string().trim().min(1).max(100).optional(),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;