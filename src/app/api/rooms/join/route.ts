/**
 * Join conversation API route.
 *
 * Allows a participant to join an existing conversation using a passcode.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogLevel } from "@prisma/client";
import { env } from "@/lib/env";
import { withApiRouteLogging } from "@/server/http/observability";
import { joinRoomSchema } from "@/validators/chat";
import { findRoomByPasscode, joinRoom } from "@/server/room.service";
import { writeAuditLog } from "@/server/security/audit-log";
import {
  applyRateLimit,
  getRequestClientIp,
} from "@/server/security/rate-limit";
import { setChatSessionCookie } from "@/server/security/session";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(request, { route: "conversation.join" }, async () => {
    const rateLimit = await applyRateLimit({
      scope: "join-room",
      identifier: getRequestClientIp(request),
      limit: env.JOIN_ROOM_RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      await writeAuditLog({
        eventType: "conversation.join.rate_limited",
        level: AuditLogLevel.WARN,
        outcome: "rate_limited",
        request,
        statusCode: 429,
        details: {
          retryAfterSeconds: rateLimit.retryAfterSeconds,
          limit: env.JOIN_ROOM_RATE_LIMIT_PER_MINUTE,
          identifier: getRequestClientIp(request),
        },
      });

      return NextResponse.json(
        { error: "Too many join attempts. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    try {
      const body = await request.json();
      const payload = joinRoomSchema.parse(body);

      const room = await findRoomByPasscode(payload.passcode);

      if (!room) {
        await writeAuditLog({
          eventType: "conversation.join.failed",
          level: AuditLogLevel.WARN,
          outcome: "room_not_found",
          request,
          statusCode: 404,
          details: {
            userName: payload.userName,
          },
        });

        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      const user = await joinRoom(room.id, payload.userName);

      const response = NextResponse.json({
        roomId: room.id,
        userName: user.name,
        roomName: room.name,
      });

      setChatSessionCookie(response, {
        roomId: room.id,
        userId: user.id,
        userName: user.name,
      });

      await writeAuditLog({
        eventType: "conversation.join.succeeded",
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
        eventType: "room.join.failed",
        level: AuditLogLevel.ERROR,
        outcome: "error",
        request,
        statusCode: 400,
        details: {
          error: error instanceof Error ? error.message : "Unknown join error",
        },
      });

      return NextResponse.json(
        { error: "Unable to join conversation" },
        { status: 400 }
      );
    }
  });
}
