/**
 * Chat type definitions.
 *
 * Provides shared frontend chat view types and role aliases.
 */

export type ChatRole =
  | "USER"
  | "ASSISTANT"
  | "SYSTEM";

export interface ChatMessageView {
  id: string;
  role: ChatRole;
  content: string;
  userName?: string | null;
  createdAt: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
}