"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const CHAT_SEEN_KEY = "escorta_chat_seen";
const POLL_INTERVAL_MS = 4000;
const MESSAGES_POLL_MS = 3000;

type Connection = {
  id: string;
  otherName: string;
  lastMessage: {
    id: string;
    message: string;
    createdAt: string;
    fromMe: boolean;
  } | null;
};

type Message = {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; role: string };
};

function getSeenMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CHAT_SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

function setSeen(connectionId: string, lastMessageId: string) {
  try {
    const map = getSeenMap();
    map[connectionId] = lastMessageId;
    localStorage.setItem(CHAT_SEEN_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function ChatWidget() {
  const pathname = usePathname();
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [, setSeenVersion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConnections = useCallback(() => {
    if (!token || !user) return;
    fetch("/api/connections", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setConnections(data.connections || []))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [token, user]);

  useEffect(() => {
    if (!token || (user?.role !== "client" && user?.role !== "escort")) return;
    setLoading(true);
    fetchConnections();
    const id = setInterval(fetchConnections, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, user?.role, fetchConnections]);

  useEffect(() => {
    const match = pathname?.match(/^\/connections\/([^/]+)$/);
    if (match) {
      const connId = match[1];
      const conn = connections.find((c) => c.id === connId);
      if (conn?.lastMessage) {
        setSeen(connId, conn.lastMessage.id);
        setSeenVersion((v) => v + 1);
      }
    }
  }, [pathname, connections]);

  const fetchMessages = useCallback(() => {
    if (!selectedConn || !token) return;
    fetch(`/api/bookings/${selectedConn.id}/messages?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, [selectedConn?.id, token]);

  useEffect(() => {
    if (!selectedConn) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    fetchMessages();
    const id = setInterval(fetchMessages, MESSAGES_POLL_MS);
    return () => clearInterval(id);
  }, [selectedConn?.id, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedConn?.lastMessage) {
      setSeen(selectedConn.id, selectedConn.lastMessage.id);
      setSeenVersion((v) => v + 1);
    }
  }, [selectedConn?.id, selectedConn?.lastMessage?.id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || !selectedConn || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${selectedConn.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
        fetchConnections();
      }
    } finally {
      setSending(false);
    }
  }

  const unreadConnections = connections.filter((c) => {
    if (!c.lastMessage || c.lastMessage.fromMe) return false;
    const seen = getSeenMap()[c.id];
    return seen !== c.lastMessage.id;
  });
  const unreadCount = unreadConnections.length;

  const [showNewMessageToast, setShowNewMessageToast] = useState(false);
  const prevUnreadCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadCountRef.current !== null && unreadCount > prevUnreadCountRef.current) {
      setShowNewMessageToast(true);
      const t = setTimeout(() => setShowNewMessageToast(false), 4000);
      prevUnreadCountRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  if (!user || (user.role !== "client" && user.role !== "escort")) return null;

  const panelHeight = "min(500px, 75vh)";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {showNewMessageToast && unreadConnections[0] && (
        <div
          role="alert"
          className="mb-2 px-4 py-3 border border-[var(--color-champagne)] bg-[var(--color-obsidian)] shadow-lg text-sm"
        >
          <p className="text-[var(--color-ivory)]">
            New message from{" "}
            <span className="text-[var(--color-champagne)]">
              {unreadConnections[0].otherName}
            </span>
          </p>
          <button
            onClick={() => {
              setSelectedConn(unreadConnections[0]);
              setOpen(true);
              setShowNewMessageToast(false);
            }}
            className="mt-2 text-xs tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)]"
          >
            View chat
          </button>
        </div>
      )}
      {open && (
        <div
          className="w-96 border border-[var(--color-border)] bg-[var(--color-obsidian)] shadow-xl flex flex-col overflow-hidden"
          style={{ height: panelHeight }}
        >
          {selectedConn ? (
            <>
              <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setSelectedConn(null);
                    setMessages([]);
                  }}
                  className="text-[var(--color-silver)] hover:text-[var(--color-ivory)] text-lg leading-none p-1"
                  aria-label="Back to list"
                >
                  ←
                </button>
                <h3 className="text-sm font-medium text-[var(--color-ivory)] truncate flex-1">
                  {selectedConn.otherName}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {messagesLoading && messages.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">Loading...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">
                    No messages yet. Say hello.
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.sender.id === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded text-sm ${
                          m.sender.id === user?.id
                            ? "bg-[var(--color-champagne)]/20 border border-[var(--color-champagne)]/40 text-[var(--color-ivory)]"
                            : "bg-[var(--color-slate)] border border-[var(--color-border)] text-[var(--color-pearl)]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p className="text-[10px] text-[var(--color-muted)] mt-1">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-[var(--color-border)] flex gap-2 flex-shrink-0"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={2000}
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 rounded"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="px-4 py-2 text-xs tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 rounded"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center flex-shrink-0">
                <h3 className="text-sm font-medium tracking-widest uppercase text-[var(--color-champagne)]">
                  Chats
                </h3>
                <button
                  onClick={() => {
                    setOpen(false);
                    setSelectedConn(null);
                  }}
                  className="text-[var(--color-silver)] hover:text-[var(--color-ivory)] text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {loading && connections.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--color-muted)]">Loading...</p>
                ) : connections.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--color-muted)]">
                    No active chats yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {connections.map((c) => {
                      const hasUnread =
                        c.lastMessage &&
                        !c.lastMessage.fromMe &&
                        getSeenMap()[c.id] !== c.lastMessage.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (c.lastMessage) {
                              setSeen(c.id, c.lastMessage.id);
                              setSeenVersion((v) => v + 1);
                            }
                            setSelectedConn(c);
                          }}
                          className="w-full text-left block p-4 hover:bg-[var(--color-charcoal)] transition"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-medium truncate ${
                                  hasUnread ? "text-[var(--color-champagne)]" : "text-[var(--color-ivory)]"
                                }`}
                              >
                                {c.otherName}
                              </p>
                              {c.lastMessage && (
                                <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">
                                  {c.lastMessage.fromMe ? "You: " : ""}
                                  {c.lastMessage.message}
                                </p>
                              )}
                            </div>
                            {hasUnread && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--color-champagne)] mt-1.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-[var(--color-champagne)] text-[var(--color-obsidian)] flex items-center justify-center shadow-lg hover:opacity-90 transition relative"
        aria-label={open ? "Close chats" : "Open chats"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-medium bg-red-500 text-white rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
