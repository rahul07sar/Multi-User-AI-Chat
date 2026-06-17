/**
 * Chat panel.
 *
 * Encapsulates the client-side chat experience for a joined conversation.
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { ChatMessageView } from "@/types/chat";

type ChatPanelProps = {
  initialRoomId: string;
  initialUserName: string;
};

type InviteResponse = {
  inviteUrl: string;
  expiresAt: string;
};

type ParticipantView = {
  id: string;
  name: string;
  isTyping: boolean;
  lastSeenAt: string | null;
};

type ApiError = Error & {
  status?: number;
};

const MESSAGE_POLL_INTERVAL_MS = 3000;

export function ChatPanel({
  initialRoomId,
  initialUserName,
}: ChatPanelProps) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [authError, setAuthError] = useState("");
  const [error, setError] = useState("");
  const [typingTimeoutId, setTypingTimeoutId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function readErrorMessage(
    response: Response,
    fallbackMessage: string
  ) {
    try {
      const data = (await response.json()) as {
        error?: string;
      };

      return data.error || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }

  function createApiError(status: number, message: string) {
    const error = new Error(message) as ApiError;

    error.status = status;

    return error;
  }

  async function logout(redirectPath = "/") {
    setIsLoggingOut(true);

    try {
      await fetch("/api/session/logout", {
        method: "POST",
      });
    } finally {
      router.push(redirectPath);
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  async function createInvite() {
    if (authError) {
      return;
    }

    setIsCreatingInvite(true);
    setInviteStatus("");
    setError("");

    try {
      const response = await fetch("/api/chat/invite", {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Unable to create invite."
        );

        throw createApiError(response.status, message);
      }

      const data = (await response.json()) as InviteResponse;

      setInviteUrl(data.inviteUrl);
      setInviteExpiresAt(data.expiresAt);
      setInviteStatus("Invite link created.");
    } catch (caughtError) {
      const apiError = caughtError as ApiError;

      if (apiError.status === 401 || apiError.status === 403) {
        setAuthError(apiError.message || "Your session is no longer valid.");
        return;
      }

      setError(apiError.message || "Unable to create invite.");
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteStatus("Invite link copied.");
    } catch {
      setInviteStatus("Copy failed. Please copy the link manually.");
    }
  }

  useEffect(() => {
    if (!inviteExpiresAt) {
      return;
    }

    const expiresAtMs = new Date(inviteExpiresAt).getTime();
    const timeoutMs = expiresAtMs - Date.now();

    if (timeoutMs <= 0) {
      setInviteUrl("");
      setInviteExpiresAt("");
      setInviteStatus("Invite expired.");

      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInviteUrl("");
      setInviteExpiresAt("");
      setInviteStatus("Invite expired.");
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inviteExpiresAt]);

  const loadMessages = useCallback(
    async (targetRoomId: string) => {
      if (!targetRoomId) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }

      const response = await fetch(
        `/api/chat/messages?roomId=${encodeURIComponent(targetRoomId)}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Unable to load messages."
        );

        throw createApiError(response.status, message);
      }

      const data = (await response.json()) as {
        messages: ChatMessageView[];
      };

      setMessages(data.messages);
      setIsLoadingMessages(false);
    },
    []
  );

  useEffect(() => {
    if (!initialRoomId || authError) {
      setIsLoadingMessages(false);
      return;
    }

    let isActive = true;
    let fallbackIntervalId: number | null = null;

    const refreshMessages = async () => {
      try {
        await loadMessages(initialRoomId);

        if (isActive) {
          setError("");
        }
      } catch (caughtError) {
        const apiError = caughtError as ApiError;

        if (!isActive) {
          return;
        }

        if (apiError.status === 401 || apiError.status === 403) {
          setAuthError(
            apiError.message ||
              "Your session is no longer valid. Join a new conversation."
          );
          setMessages([]);
          setContent("");
          return;
        }

        setError(apiError.message || "Unable to load messages.");
        setIsLoadingMessages(false);
      }
    };

    const startPollingFallback = () => {
      if (fallbackIntervalId !== null) {
        return;
      }

      fallbackIntervalId = window.setInterval(() => {
        void refreshMessages();
      }, MESSAGE_POLL_INTERVAL_MS);
    };

    const eventSource = new EventSource("/api/chat/events");

    eventSource.addEventListener("messages", (event) => {
      try {
        const data = JSON.parse(event.data) as {
          messages: ChatMessageView[];
          participants: ParticipantView[];
        };

        if (isActive) {
          setMessages(data.messages);
          setParticipants(data.participants);
          setIsLoadingMessages(false);
          setError("");
        }
      } catch {
        if (isActive) {
          startPollingFallback();
        }
      }
    });

    eventSource.addEventListener("error", () => {
      if (isActive) {
        startPollingFallback();
      }
    });

    void refreshMessages();

    return () => {
      isActive = false;
      eventSource.close();

      if (fallbackIntervalId !== null) {
        window.clearInterval(fallbackIntervalId);
      }
    };
  }, [authError, initialRoomId, loadMessages]);

  async function updateTypingState(isTyping: boolean) {
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isTyping,
        }),
      });
    } catch {
      // ignoring typing failures
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authError) {
      return;
    }

    if (!content.trim()) {
      setError("Message cannot be empty.");
      return;
    }

    setIsSending(true);
    setError("");

    const trimmedContent = content.trim();

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmedContent,
        }),
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Unable to send message."
        );

        if (response.status === 401 || response.status === 403) {
          setAuthError(message || "Your session is no longer valid.");
          setMessages([]);
          setContent("");
        } else {
          setError(message);
        }

        return;
      }

      setContent("");
      await updateTypingState(false);
      await loadMessages(initialRoomId);
    } catch {
      setError("Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || authError) {
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await readErrorMessage(
          response,
          "Unable to upload file."
        );

        if (response.status === 401 || response.status === 403) {
          setAuthError(message || "Your session is no longer valid.");
          setMessages([]);
          setContent("");
          return;
        }

        throw new Error(message);
      }

      await loadMessages(initialRoomId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload file."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  const typingUsers = participants.filter(
    (participant) =>
      participant.isTyping && participant.name !== initialUserName
  );

  return (
    <main className="chat-page">
      <section className="chat-shell">
        <header className="chat-header">
          <div>
            <p className="chat-eyebrow">Shared conversation</p>
            <h1>Product chat</h1>
          </div>

          <div className="chat-header-actions">
            <span>{initialUserName}</span>

            <button
              className="chat-header-button"
              type="button"
              onClick={() => void createInvite()}
              disabled={isCreatingInvite || Boolean(authError)}
            >
              {isCreatingInvite ? "Creating..." : "Invite collaborator"}
            </button>

            <button
              className="chat-header-button"
              type="button"
              onClick={() => void logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Leaving..." : "Leave conversation"}
            </button>
          </div>
        </header>

        {inviteUrl ? (
          <section className="chat-invite-panel">
            <div>
              <strong>Invite link</strong>
              <p>
                This link expires at{" "}
                {new Date(inviteExpiresAt).toLocaleString()}.
              </p>
            </div>

            <input value={inviteUrl} readOnly />

            <button
              className="chat-header-button"
              type="button"
              onClick={() => void copyInviteLink()}
            >
              Copy link
            </button>

            {inviteStatus ? (
              <p className="chat-invite-status">{inviteStatus}</p>
            ) : null}
          </section>
        ) : null}

        {typingUsers.length > 0 ? (
          <div className="chat-typing-indicator">
            {typingUsers.map((participant) => participant.name).join(", ")}{" "}
            {typingUsers.length === 1 ? "is typing..." : "are typing..."}
          </div>
        ) : null}

        <section className="chat-messages">
          {authError ? (
            <div className="chat-session-notice">
              <h2>Session ended</h2>
              <p>{authError}</p>
              <button
                className="chat-header-button"
                type="button"
                onClick={() => void logout()}
                disabled={isLoggingOut}
              >
                Return home
              </button>
            </div>
          ) : isLoadingMessages ? (
            <p className="chat-empty">Loading conversation...</p>
          ) : messages.length === 0 ? (
            <p className="chat-empty">Start the conversation.</p>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "USER"
                    ? "chat-message chat-message-user"
                    : "chat-message chat-message-assistant"
                }
              >
                <strong>
                  {message.role === "USER"
                    ? message.userName ?? "User"
                    : "Assistant"}
                </strong>

                {message.content ? <p>{message.content}</p> : null}

                {message.attachmentUrl ? (
                  message.attachmentType?.startsWith("image/") ? (
                    <a
                      href={message.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="chat-image-attachment-link"
                    >
                      <img
                        src={message.attachmentUrl}
                        alt={message.attachmentName ?? "Attachment"}
                        className="chat-image-attachment"
                      />
                    </a>
                  ) : (
                    <a
                      href={message.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="chat-file-attachment"
                    >
                      📎 {message.attachmentName ?? "Attachment"}
                    </a>
                  )
                ) : null}
              </article>
            ))
          )}
        </section>

        {error ? <p className="chat-error">{error}</p> : null}

        <form className="chat-form" onSubmit={sendMessage}>
          <input
            value={content}
            onChange={(event) => {
              setContent(event.target.value);

              void updateTypingState(true);

              if (typingTimeoutId !== null) {
                window.clearTimeout(typingTimeoutId);
              }

              const timeoutId = window.setTimeout(() => {
                void updateTypingState(false);
              }, 3000);

              setTypingTimeoutId(timeoutId);
            }}
            placeholder="Ask about the product..."
            maxLength={4000}
            disabled={isSending || Boolean(authError)}
          />

          <label className="chat-upload-button">
            {isUploading ? "Uploading..." : "Attach File 📎"}
            <input
              type="file"
              hidden
              accept=".txt,.pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp"
              onChange={uploadFile}
              disabled={isUploading || Boolean(authError)}
            />
          </label>

          <button
            type="submit"
            disabled={isSending || isUploading || Boolean(authError)}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}