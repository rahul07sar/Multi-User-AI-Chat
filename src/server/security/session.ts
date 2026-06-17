/**
 * Chat session security helpers.
 *
 * Provides signed cookie helpers for room-scoped chat sessions.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export const CHAT_SESSION_COOKIE_NAME = "chat_session";

const CHAT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type ChatSession = {
  roomId: string;
  userId: string;
  userName: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", env.CHAT_SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createChatSessionToken(session: ChatSession) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signSessionPayload(payload);

  return `${payload}.${signature}`;
}

export function verifyChatSessionToken(token: string): ChatSession | null {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(fromBase64Url(payload)) as ChatSession;

    if (!parsedPayload.roomId || !parsedPayload.userId || !parsedPayload.userName) {
      return null;
    }

    return parsedPayload;
  } catch {
    return null;
  }
}

export function getChatSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(CHAT_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyChatSessionToken(token);
}

export function setChatSessionCookie(
  response: NextResponse,
  session: ChatSession
) {
  response.cookies.set({
    name: CHAT_SESSION_COOKIE_NAME,
    value: createChatSessionToken(session),
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: CHAT_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearChatSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: CHAT_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
