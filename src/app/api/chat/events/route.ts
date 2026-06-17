/**
 * Chat events API route.
 *
 * Streams recent conversation messages over Server-Sent Events.
 */

import { NextRequest } from "next/server";
import { getRoomMessages } from "@/server/chat.service";
import { mapMessageToDto } from "@/server/message.mapper";
import {
  findRoomUserById,
  getActiveParticipants,
} from "@/server/room.service";
import { getChatSessionFromRequest } from "@/server/security/session";

const STREAM_INTERVAL_MS = 2000;

function encodeSseMessage(eventName: string, data: unknown) {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const session = getChatSessionFromRequest(request);

  if (!session) {
    return new Response(
      encodeSseMessage("error", {
        error: "Session not found",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  const user = await findRoomUserById(session.roomId, session.userId);

  if (!user) {
    return new Response(
      encodeSseMessage("error", {
        error: "User does not belong to this conversation",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  const encoder = new TextEncoder();

  let lastStreamSignature = "";

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessages = async () => {
        const messages = await getRoomMessages(session.roomId);
        const participants = await getActiveParticipants(session.roomId);
        const mappedMessages = messages.map(mapMessageToDto);

        const messageSignature = mappedMessages
          .map((message) => message.id)
          .join(":");
        const participantSignature = participants
          .map((participant) =>
            [
              participant.id,
              participant.isTyping ? "typing" : "idle",
              participant.lastSeenAt ?? "",
            ].join(":")
          )
          .join("|");
        const streamSignature = `${messageSignature}::${participantSignature}`;

        if (streamSignature !== lastStreamSignature) {
          lastStreamSignature = streamSignature;

          controller.enqueue(
            encoder.encode(
              encodeSseMessage("messages", {
                messages: mappedMessages,
                participants,
              })
            )
          );
        }
      };

      await sendMessages();

      const intervalId = setInterval(() => {
        void sendMessages().catch(() => {
          controller.close();
          clearInterval(intervalId);
        });
      }, STREAM_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}