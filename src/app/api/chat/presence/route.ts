/**
 * Chat presence API route.
 *
 * Updates participant presence and returns active participants.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getActiveParticipants,
  updateParticipantPresence,
} from "@/server/room.service";
import { getChatSessionFromRequest } from "@/server/security/session";

export async function GET(request: NextRequest) {
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

  await updateParticipantPresence(
    session.roomId,
    session.userId
  );

  const participants = await getActiveParticipants(
    session.roomId
  );

  return NextResponse.json({
    participants,
  });
}