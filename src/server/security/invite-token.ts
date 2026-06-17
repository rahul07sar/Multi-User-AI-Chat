/**
 * Invite token security helpers.
 *
 * Generates one-time collaboration invite tokens and stores only a keyed hash
 * for lookup. Raw invite tokens must never be persisted.
 */

import { createHmac, randomBytes } from "crypto";
import { env } from "@/lib/env";

const INVITE_TOKEN_BYTES = 32;

export function createInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHmac("sha256", env.PASSCODE_PEPPER)
    .update(token.trim())
    .digest("hex");
}