/**
 * Conversation secret helpers.
 *
 * Generates high-entropy internal passcodes for private conversations.
 * These values are used only for server-side room bootstrap and should not
 * be exposed as long-lived user-facing invite codes.
 */

import { randomBytes } from "crypto";

const CONVERSATION_SECRET_BYTES = 32;

export function createConversationSecret(): string {
  return randomBytes(CONVERSATION_SECRET_BYTES).toString("base64url");
}