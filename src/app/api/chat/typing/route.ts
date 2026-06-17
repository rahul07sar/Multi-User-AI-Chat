/**
 * Chat typing API route.
 *
 * Updates participant typing state.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getChatSessionFromRequest } from "@/server/security/session";
import { updateParticipantTypingState } from "@/server/room.service";

const typingSchema = z.object({
  isTyping: z.boolean(),
});

export async function POST(request: NextRequest) {
  const session = getChatSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        error: "Session not found",
      },
      {
        status: 401,
      }
    );
  }

  const payload = typingSchema.parse(
    await request.json()
  );

  await updateParticipantTypingState(
    session.roomId,
    session.userId,
    payload.isTyping
  );

  return NextResponse.json({
    success: true,
  });
}