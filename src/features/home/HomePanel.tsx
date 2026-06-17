/**
 * Home panel.
 *
 * Starts a private product conversation without exposing room or passcode setup
 * to the user. Collaboration invites are handled later from inside the chat.
 */

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type StartConversationResponse = {
  conversationId: string;
  roomId: string;
  roomName: string | null;
  userName: string;
};

export function HomePanel() {
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const safeUserName = userName.trim();

    if (!safeUserName) {
      setError("Please enter your name.");
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const response = await fetch("/api/conversations/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: safeUserName,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to start conversation.");
      }

      const conversation =
        (await response.json()) as StartConversationResponse;

        router.push(`/chat/${conversation.conversationId}`);

      router.push(`/chat/${conversation.conversationId}`);
    } catch {
      setError("Unable to start chat. Please try again.");
      setIsStarting(false);
    }
  }

  return (
    <main className="home-page">
      <section className="home-hero">
        <h1>Multi User Chat Bot</h1>
        <p className="home-description">
          Start a product conversation and invite team members later when their
          input is needed.
        </p>
      </section>

      <section className="home-single-card">
        <form className="home-card" onSubmit={startConversation}>
          <h2>Start conversation</h2>

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

          <button type="submit" disabled={isStarting}>
            {isStarting ? "Starting..." : "Start chat"}
          </button>
        </form>
      </section>

      {error ? <p className="home-error">{error}</p> : null}
    </main>
  );
}