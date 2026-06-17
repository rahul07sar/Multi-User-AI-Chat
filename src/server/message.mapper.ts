/**
 * Message mapper.
 *
 * Converts database message records into safe API response objects.
 */

import type { ChatMessage, ChatUser, MessageRole } from "@prisma/client";

type MessageWithUser = ChatMessage & {
  user: ChatUser | null;
};

export type ChatMessageDto = {
  id: string;
  role: MessageRole;
  content: string;
  userName: string | null;
  createdAt: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
};

export function mapMessageToDto(message: MessageWithUser): ChatMessageDto {
  return {
    id: message.id,
    role: message.role,
    content: message.content,

    attachmentName:
      message.attachmentName,

    attachmentUrl:
      message.attachmentUrl,

    attachmentType:
      message.attachmentType,

    attachmentSize:
      message.attachmentSize,

    userName: message.user?.name ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}