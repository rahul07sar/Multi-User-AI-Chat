/**
 * Chat service.
 *
 * Encapsulates message persistence, message retrieval, and assistant response generation.
 */

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { openai } from "@/lib/openai";

const MAX_CONTEXT_MESSAGES = 30;
const MAX_RETURN_MESSAGES = 100;

export async function saveUserMessage(
  roomId: string,
  userId: string,
  content: string
) {
  const safeContent = content.trim();

  return db.chatMessage.create({
    data: {
      roomId,
      userId,
      content: safeContent,
      role: "USER",
    },
  });
}

export async function saveAssistantMessage(roomId: string, content: string) {
  const safeContent = content.trim();

  return db.chatMessage.create({
    data: {
      roomId,
      content: safeContent,
      role: "ASSISTANT",
    },
  });
}

export async function getRoomMessages(roomId: string) {
  return db.chatMessage.findMany({
    where: {
      roomId,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: MAX_RETURN_MESSAGES,
  });
}

async function getAssistantContextMessages(roomId: string) {
  const messages = await db.chatMessage.findMany({
    where: {
      roomId,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: MAX_CONTEXT_MESSAGES,
  });

  return messages.reverse();
}

function buildAssistantInput(
  messages: Awaited<ReturnType<typeof getAssistantContextMessages>>
) {
  return messages
    .map((message) => {
      const speaker =
        message.role === "USER"
          ? message.user?.name ?? "User"
          : "Assistant";

      const attachmentContext = message.attachmentText
        ? `\nAttachment Content:\n${message.attachmentText}`
        : "";

      return `${speaker}: ${message.content}${attachmentContext}`;
    })
    .join("\n");
}

export async function generateAssistantReply(roomId: string) {
  const messages = await getAssistantContextMessages(roomId);
  const input = buildAssistantInput(messages);

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    instructions: [
      "You are a helpful product application assistant.",
      "Help all participants in the shared conversation evaluate, compare, and purchase products.",
      "Use the conversation history as shared context across participants.",
      "Do not repeatedly address users by name unless clarification is needed.",
      "When requirements are unclear, ask for the smallest useful set of details.",
      "Keep replies clear, practical, concise, and neutral.",
    ].join(" "),
    input,
  });

  return response.output_text.trim();
}