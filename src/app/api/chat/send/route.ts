/**
 * Send chat message API route.
 *
 * Saves a user message and returns a persisted assistant reply.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogLevel } from "@prisma/client";
import { env } from "@/lib/env";
import { withApiRouteLogging } from "@/server/http/observability";
import { sendMessageSchema } from "@/validators/chat";
import { mapMessageToDto } from "@/server/message.mapper";
import {
  generateAssistantReply,
  saveAssistantMessage,
  saveUserMessage,
} from "@/server/chat.service";
import { findRoomUserById } from "@/server/room.service";
import { writeAuditLog } from "@/server/security/audit-log";
import { applyRateLimit } from "@/server/security/rate-limit";
import { getChatSessionFromRequest } from "@/server/security/session";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(request, { route: "chat.send" }, async () => {
    try {
      const session = getChatSessionFromRequest(request);

      if (!session) {
        await writeAuditLog({
          eventType: "chat.send.denied",
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

      const rateLimit = await applyRateLimit({
        scope: "send-message",
        identifier: `${session.roomId}:${session.userId}`,
        limit: env.SEND_MESSAGE_RATE_LIMIT_PER_MINUTE,
        windowMs: 60_000,
      });

      if (!rateLimit.allowed) {
        await writeAuditLog({
          eventType: "chat.send.rate_limited",
          level: AuditLogLevel.WARN,
          outcome: "rate_limited",
          request,
          session,
          statusCode: 429,
          details: {
            retryAfterSeconds: rateLimit.retryAfterSeconds,
            limit: env.SEND_MESSAGE_RATE_LIMIT_PER_MINUTE,
          },
        });

        return NextResponse.json(
          { error: "Too many messages sent too quickly. Please slow down." },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimit.retryAfterSeconds),
            },
          }
        );
      }

      const body = await request.json();
      const payload = sendMessageSchema.parse(body);

      const user = await findRoomUserById(session.roomId, session.userId);

      if (!user) {
        await writeAuditLog({
          eventType: "chat.send.denied",
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

      await saveUserMessage(
        session.roomId,
        session.userId,
        payload.content
      );

      const reply = await generateAssistantReply(session.roomId);
      const assistantMessage = await saveAssistantMessage(
        session.roomId,
        reply
      );

      await writeAuditLog({
        eventType: "chat.send.succeeded",
        level: AuditLogLevel.INFO,
        outcome: "success",
        request,
        session,
        statusCode: 200,
        details: {
          contentLength: payload.content.length,
          assistantMessageId: assistantMessage.id,
        },
      });

      return NextResponse.json({
        message: mapMessageToDto({
         ...assistantMessage,
        user: null,
        }),
    });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown send error";

      await writeAuditLog({
        eventType: "chat.send.failed",
        level: AuditLogLevel.ERROR,
        outcome: "error",
        request,
        session: getChatSessionFromRequest(request),
        statusCode: 400,
        details: {
          error: errorMessage,
        },
      });

      return NextResponse.json(
        {
          error:
            env.NODE_ENV === "production"
              ? "Unable to send message"
              : errorMessage,
        },
        { status: 400 }
      );
    }
  });
}