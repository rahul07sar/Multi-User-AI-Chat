/**
 * Start conversation API route.
 *
 * Starts a private product conversation, creates the initial participant,
 * sets a signed chat session cookie, and returns the conversation identifier.
 */

import { AuditLogLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createConversationSecret } from "@/server/security/conversation-secret";
import { withApiRouteLogging } from "@/server/http/observability";
import { createRoom, joinRoom } from "@/server/room.service";
import { setChatSessionCookie } from "@/server/security/session";
import { startConversationSchema } from "@/validators/chat";
import { writeAuditLog } from "@/server/security/audit-log";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(
    request,
    {
      route: "conversation.start",
    },
    async () => {
      try {
        const body = await request.json();
        const payload = startConversationSchema.parse(body);

        const conversationSecret = createConversationSecret();
        const room = await createRoom(
          conversationSecret,
          "Product conversation"
        );
        const user = await joinRoom(room.id, payload.userName);

        const response = NextResponse.json({
          conversationId: room.id,
          roomId: room.id,
          roomName: room.name,
          userName: user.name,
        });

        setChatSessionCookie(response, {
          roomId: room.id,
          userId: user.id,
          userName: user.name,
        });

        await writeAuditLog({
          eventType: "conversation.start.succeeded",
          level: AuditLogLevel.INFO,
          outcome: "success",
          request,
          roomId: room.id,
          userId: user.id,
          statusCode: 200,
          details: {
            roomName: room.name,
            userName: user.name,
          },
        });

        return response;
      } catch (error) {
        await writeAuditLog({
          eventType: "conversation.start.failed",
          level: AuditLogLevel.ERROR,
          outcome: "error",
          request,
          statusCode: 400,
          details: {
            error:
              error instanceof Error
                ? error.message
                : "Unknown conversation start error",
          },
        });

        return NextResponse.json(
          {
            error: "Unable to start conversation",
          },
          {
            status: 400,
          }
        );
      }
    }
  );
}