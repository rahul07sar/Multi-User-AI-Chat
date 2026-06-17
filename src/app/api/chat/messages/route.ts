/**
 * Chat messages API route.
 *
 * Returns recent messages for a room.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogLevel } from "@prisma/client";
import { getRoomMessages } from "@/server/chat.service";
import { withApiRouteLogging } from "@/server/http/observability";
import { mapMessageToDto } from "@/server/message.mapper";
import { findRoomUserById } from "@/server/room.service";
import { writeAuditLog } from "@/server/security/audit-log";
import { getChatSessionFromRequest } from "@/server/security/session";
import { getRoomMessagesSchema } from "@/validators/chat";

export async function GET(request: NextRequest) {
  return withApiRouteLogging(request, { route: "chat.messages" }, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const session = getChatSessionFromRequest(request);

      if (!session) {
        await writeAuditLog({
          eventType: "chat.messages.denied",
          level: AuditLogLevel.WARN,
          outcome: "missing_session",
          request,
          statusCode: 401,
        });

        return NextResponse.json(
          { error: "Session not found" },
          { status: 401 }
        );
      }

      const payload = getRoomMessagesSchema.parse({
        roomId: searchParams.get("roomId"),
      });

      if (payload.roomId !== session.roomId) {
        await writeAuditLog({
          eventType: "chat.messages.denied",
          level: AuditLogLevel.WARN,
          outcome: "room_access_denied",
          request,
          session,
          statusCode: 403,
          details: {
            requestedRoomId: payload.roomId,
          },
        });

        return NextResponse.json(
          { error: "Room access denied" },
          { status: 403 }
        );
      }

      const user = await findRoomUserById(session.roomId, session.userId);

      if (!user) {
        await writeAuditLog({
          eventType: "chat.messages.denied",
          level: AuditLogLevel.WARN,
          outcome: "room_membership_missing",
          request,
          session,
          statusCode: 403,
        });

        return NextResponse.json(
          { error: "User does not belong to this room" },
          { status: 403 }
        );
      }

      const messages = await getRoomMessages(session.roomId);

      return NextResponse.json({
        messages: messages.map(mapMessageToDto),
      });
    } catch (error) {
      await writeAuditLog({
        eventType: "chat.messages.failed",
        level: AuditLogLevel.ERROR,
        outcome: "error",
        request,
        session: getChatSessionFromRequest(request),
        statusCode: 400,
        details: {
          error:
            error instanceof Error
              ? error.message
              : "Unknown message retrieval error",
        },
      });

      return NextResponse.json(
        { error: "Unable to load messages" },
        { status: 400 }
      );
    }
  });
}
