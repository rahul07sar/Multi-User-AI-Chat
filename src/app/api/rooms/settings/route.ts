/**
 * Room settings API route.
 *
 * Retrieves and updates room settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getChatSessionFromRequest } from "@/server/security/session";
import {
  getRoomSettings,
  updateRoomSettings,
} from "@/server/room-settings.service";
import { updateRoomSettingsSchema } from "@/validators/room-settings";

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

  const settings = await getRoomSettings(
    session.roomId
  );

  if (!settings) {
    return NextResponse.json(
      {
        error: "Room not found",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(settings);
}

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

  const payload = updateRoomSettingsSchema.parse(
    await request.json()
  );

  const settings = await updateRoomSettings(
    session.roomId,
    payload
  );

  return NextResponse.json(settings);
}