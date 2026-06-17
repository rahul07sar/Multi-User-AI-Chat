/**
 * Chat conversation page.
 *
 * Validates the signed chat session cookie before rendering the conversation.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChatPanel } from "@/features/chat/ChatPanel";
import {
  CHAT_SESSION_COOKIE_NAME,
  verifyChatSessionToken,
} from "@/server/security/session";
import "@/styles/chat.css";

type ChatRoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function ChatRoomPage({
  params,
}: ChatRoomPageProps) {
  const { roomId } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;

  const session = sessionToken
    ? verifyChatSessionToken(sessionToken)
    : null;

  if (!session) {
    redirect("/");
  }

  if (session.roomId !== roomId) {
    redirect(`/chat/${session.roomId}`);
  }

  return (
    <ChatPanel
      initialRoomId={roomId}
      initialUserName={session.userName}
    />
  );
}