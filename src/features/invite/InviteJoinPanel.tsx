/**
 * Invite join panel.
 *
 * Allows a participant to join an existing conversation using an invite link.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type InviteJoinPanelProps = {
  inviteToken: string;
};

type JoinConversationResponse = {
  roomId: string;
  userId: string;
  userName: string;
};

type ApiErrorResponse = {
  error: string;
};

function isApiErrorResponse(
  data: JoinConversationResponse | ApiErrorResponse
): data is ApiErrorResponse {
  return "error" in data;
}

export function InviteJoinPanel({
  inviteToken,
}: InviteJoinPanelProps) {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  async function joinConversation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const safeUserName = userName.trim();

    if (!inviteToken) {
      setError("Invite token is missing.");
      return;
    }

    if (!safeUserName) {
      setError("Please enter your name.");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const response = await fetch("/api/chat/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteToken,
          userName: safeUserName,
        }),
      });

      const data = (await response.json()) as
        | JoinConversationResponse
        | ApiErrorResponse;

      if (isApiErrorResponse(data)) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error("Unable to join conversation.");
      }

      router.push(`/chat/${data.roomId}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to join conversation."
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="invite-page">
      <section className="invite-card">
        <h1>Join Conversation</h1>

        <p className="invite-description">
          You have been invited to collaborate in an existing conversation.
        </p>

        <form onSubmit={joinConversation}>
          <label>
            Your name
            <input
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              required
            />
          </label>

          <button type="submit" disabled={isJoining}>
            {isJoining ? "Joining..." : "Join conversation"}
          </button>
        </form>

        {error ? <p className="invite-error">{error}</p> : null}
      </section>
    </main>
  );
}