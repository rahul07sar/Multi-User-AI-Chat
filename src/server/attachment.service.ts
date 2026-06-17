/**
 * Attachment service.
 *
 * Handles attachment metadata persistence.
 */

import { db } from "@/lib/db";

type AttachmentInput = {
  roomId: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  attachmentText?: string | null;
};

export async function saveAttachmentMessage(
  input: AttachmentInput
) {
  return db.chatMessage.create({
    data: {
      roomId: input.roomId,
      userId: input.userId,
      role: "USER",
      content: "",
      attachmentName: input.fileName,
      attachmentUrl: input.fileUrl,
      attachmentType: input.fileType,
      attachmentSize: input.fileSize,
      attachmentText: input.attachmentText ?? null,
    },
  });
}