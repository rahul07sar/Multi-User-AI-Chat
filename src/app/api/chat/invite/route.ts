/**
 * Chat invite API route.
 *
 * Creates a short-lived collaboration invite for the active conversation.
 */

import { AuditLogLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { withApiRouteLogging } from "@/server/http/observability";
import { createConversationInvite } from "@/server/invite.service";
import { findRoomUserById } from "@/server/room.service";
import { writeAuditLog } from "@/server/security/audit-log";
import { getChatSessionFromRequest } from "@/server/security/session";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(
    request,
    {
      route: "chat.invite",
    },
    async () => {
      try {
        const session = getChatSessionFromRequest(request);

        if (!session) {
          await writeAuditLog({
            eventType: "chat.invite.denied",
            level: AuditLogLevel.WARN,
            outcome: "missing_session",
            request,
            statusCode: 401,
          });

          return NextResponse.json(
            {
              error: "Session not found",
            },
            {
              status: 401,
            }
          );
        }

        const user = await findRoomUserById(session.roomId, session.userId);

        if (!user) {
          await writeAuditLog({
            eventType: "chat.invite.denied",
            level: AuditLogLevel.WARN,
            outcome: "room_membership_missing",
            request,
            session,
            statusCode: 403,
          });

          return NextResponse.json(
            {
              error: "User does not belong to this conversation",
            },
            {
              status: 403,
            }
          );
        }

        const invite = await createConversationInvite(session.roomId);
        const inviteUrl = new URL(
          `/join?invite=${encodeURIComponent(invite.token)}`,
          request.nextUrl.origin
        );

        await writeAuditLog({
          eventType: "chat.invite.created",
          level: AuditLogLevel.INFO,
          outcome: "success",
          request,
          session,
          statusCode: 200,
          details: {
            inviteId: invite.id,
            expiresAt: invite.expiresAt.toISOString(),
          },
        });

        return NextResponse.json({
          inviteUrl: inviteUrl.toString(),
          expiresAt: invite.expiresAt.toISOString(),
        });
      } catch (error) {
        await writeAuditLog({
          eventType: "chat.invite.failed",
          level: AuditLogLevel.ERROR,
          outcome: "error",
          request,
          session: getChatSessionFromRequest(request),
          statusCode: 400,
          details: {
            error:
              error instanceof Error
                ? error.message
                : "Unknown invite creation error",
          },
        });

        return NextResponse.json(
          {
            error: "Unable to create invite",
          },
          {
            status: 400,
          }
        );
      }
    }
  );
}