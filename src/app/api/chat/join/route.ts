/**
 * Chat invite join API route.
 *
 * Allows a user to join an existing conversation using a collaboration invite.
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogLevel } from "@prisma/client";
import { withApiRouteLogging } from "@/server/http/observability";
import { joinRoom } from "@/server/room.service";
import { consumeConversationInvite } from "@/server/invite.service";
import { writeAuditLog } from "@/server/security/audit-log";
import { setChatSessionCookie } from "@/server/security/session";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(
    request,
    {
      route: "chat.joinInvite",
    },
    async () => {
      try {
        const body = (await request.json()) as {
          inviteToken: string;
          userName: string;
        };

        const inviteToken = body.inviteToken?.trim();
        const userName = body.userName?.trim();

        if (!inviteToken || !userName) {
          return NextResponse.json(
            {
              error: "Invite token and user name are required",
            },
            {
              status: 400,
            }
          );
        }

        const invite = await consumeConversationInvite(inviteToken);

        if (!invite) {
          await writeAuditLog({
            eventType: "chat.invite.join_failed",
            level: AuditLogLevel.WARN,
            outcome: "invalid_invite",
            request,
            statusCode: 404,
          });

          return NextResponse.json(
            {
              error: "Invite is invalid or expired",
            },
            {
              status: 404,
            }
          );
        }

        const user = await joinRoom(invite.roomId, userName);

        const response = NextResponse.json({
          roomId: invite.roomId,
          userId: user.id,
          userName: user.name,
        });

        setChatSessionCookie(response, {
          roomId: invite.roomId,
          userId: user.id,
          userName: user.name,
        });

        await writeAuditLog({
          eventType: "chat.invite.join_succeeded",
          level: AuditLogLevel.INFO,
          outcome: "success",
          request,
          roomId: invite.roomId,
          userId: user.id,
          statusCode: 200,
          details: {
            userName: user.name,
          },
        });

        return response;
      } catch (error) {
        await writeAuditLog({
          eventType: "chat.invite.join_failed",
          level: AuditLogLevel.ERROR,
          outcome: "error",
          request,
          statusCode: 400,
          details: {
            error:
              error instanceof Error
                ? error.message
                : "Unknown invite join error",
          },
        });

        return NextResponse.json(
          {
            error: "Unable to join conversation",
          },
          {
            status: 400,
          }
        );
      }
    }
  );
}