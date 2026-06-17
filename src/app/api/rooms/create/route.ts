/**
 * Create room API route.
 *
 * Creates a new private conversation. The room remains an internal
 * implementation detail and is not exposed in the UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiRouteLogging } from "@/server/http/observability";
import { createRoomSchema } from "@/validators/chat";
import { createRoom } from "@/server/room.service";

export async function POST(request: NextRequest) {
  return withApiRouteLogging(
    request,
    {
      route: "conversation.start",
    },
    async () => {
      try {
        const body = await request.json();
        const payload = createRoomSchema.parse(body);

        const room = await createRoom(
          payload.passcode,
          payload.roomName ?? "Conversation"
        );

        return NextResponse.json({
          conversationId: room.id,
          roomId: room.id,
          roomName: room.name,
        });
      } catch {
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