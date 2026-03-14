"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BlurredImage } from "@/components/BlurredImage";

const CHAT_SEEN_KEY = "escorta_chat_seen";
const POLL_INTERVAL_MS = 4000;
const MESSAGES_POLL_MS = 10000;

type Connection = {
  id: string;
  otherName: string;
  otherImageUrl?: string | null;
  otherPhotoId?: string | null;
  canSend?: boolean;
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

function mergeMessages(prev: Message[], next: Message[]): Message[] {
  if (!next?.length) return prev;
  if (!prev?.length) return next;
  const byId = new Map(prev.map((m) => [m.id, m]));
  const merged = next.map((m) => byId.get(m.id) ?? m);
  if (merged.length === prev.length && merged.every((m, i) => m === prev[i])) return prev;
  return merged;
}

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
  const { user, token, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [, setSeenVersion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const prevConnectionIdsRef = useRef<Set<string>>(new Set());
  const [acceptanceToast, setAcceptanceToast] = useState<{ name: string; id: string } | null>(null);

  const fetchConnections = useCallback(() => {
    if (!token || !user) return;
    fetch("/api/connections", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        const list: Connection[] = data.connections || [];
        if (user?.role === "client" && prevConnectionIdsRef.current.size > 0) {
          const added = list.find((c) => !prevConnectionIdsRef.current.has(c.id));
          if (added) setAcceptanceToast({ name: added.otherName, id: added.id });
        }
        prevConnectionIdsRef.current = new Set(list.map((c) => c.id));
        setConnections(list);
      })
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [token, user]);

  useEffect(() => {
    if (!acceptanceToast) return;
    const t = setTimeout(() => setAcceptanceToast(null), 5000);
    return () => clearTimeout(t);
  }, [acceptanceToast]);

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
      .then((data) => {
        const next = data.messages || [];
        setMessages((prev) => mergeMessages(prev, next));
        if (typeof data.canSend === "boolean") setCanSend(data.canSend);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
      })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, [selectedConn?.id, token]);

  useEffect(() => {
    if (!selectedConn) {
      setMessages([]);
      setCurrentUserId(null);
      setCanSend(true);
      prevMessageCountRef.current = 0;
      return;
    }
    setMessages([]);
    setCurrentUserId(null);
    setMessagesLoading(true);
    setCanSend(true);
    prevMessageCountRef.current = 0;
    fetchMessages();
    const id = setInterval(fetchMessages, MESSAGES_POLL_MS);
    return () => clearInterval(id);
  }, [selectedConn?.id, fetchMessages]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length > prev) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedConn?.lastMessage) {
      setSeen(selectedConn.id, selectedConn.lastMessage.id);
      setSeenVersion((v) => v + 1);
    }
  }, [selectedConn?.id, selectedConn?.lastMessage?.id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || !selectedConn || sending || !canSend) return;
    setSendError("");
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
        refreshUser();
      } else {
        const data = await res.json().catch(() => ({}));
        setSendError(data.error || "Failed to send");
        if (res.status === 402) refreshUser();
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
      {acceptanceToast && (
        <div
          role="alert"
          className="mb-2 px-4 py-3 border border-[var(--color-champagne)] bg-[var(--color-obsidian)] shadow-lg text-sm"
        >
          <p className="text-[var(--color-ivory)]">
            <span className="text-[var(--color-champagne)]">{acceptanceToast.name}</span>
            {" "}accepted your connection request. You can chat now.
          </p>
        </div>
      )}
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
              setCanSend(unreadConnections[0].canSend ?? true);
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
                <div className="w-9 h-9 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
                  {selectedConn.otherPhotoId ? (
                    <BlurredImage photoId={selectedConn.otherPhotoId} alt="" className="w-full h-full object-cover" />
                  ) : selectedConn.otherImageUrl ? (
                    <img src={selectedConn.otherImageUrl} alt="" className="w-full h-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                  ) : (
                    <span className="text-sm text-[var(--color-muted)]">—</span>
                  )}
                </div>
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
                  messages.map((m) => {
                    const isMe = m.sender.id === (currentUserId || user?.id);
                    return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded text-sm ${
                          isMe
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
                  ); })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-[var(--color-border)] flex flex-col gap-2 flex-shrink-0">
                {!canSend && (
                  <p className="text-xs text-[var(--color-silver)]">No longer connected. Message history for reference only.</p>
                )}
                <form
                  onSubmit={handleSend}
                  className={canSend ? "" : "opacity-60 pointer-events-none"}
                >
                  {sendError && (
                    <p className="text-xs text-red-300/90">{sendError}</p>
                  )}
                  <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={canSend ? "Type a message..." : "Sending disabled"}
                    maxLength={2000}
                    disabled={!canSend}
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 rounded disabled:opacity-70"
                  />
                  <button
                    type="submit"
                    disabled={!canSend || !input.trim() || sending}
                    className="px-4 py-2 text-xs tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 rounded"
                  >
                    Send
                  </button>
                  </div>
                </form>
              </div>
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
                      const handleSelect = () => {
                        if (c.lastMessage) {
                          setSeen(c.id, c.lastMessage.id);
                          setSeenVersion((v) => v + 1);
                        }
                        setSelectedConn(c);
                        setCanSend(c.canSend ?? true);
                      };
                      return (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onClick={handleSelect}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelect();
                            }
                          }}
                          className="w-full text-left block p-4 hover:bg-[var(--color-charcoal)] transition cursor-pointer"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
                              {c.otherPhotoId ? (
                                <BlurredImage photoId={c.otherPhotoId} alt="" className="w-full h-full object-cover" />
                              ) : c.otherImageUrl ? (
                                <img src={c.otherImageUrl} alt="" className="w-full h-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                              ) : (
                                <span className="text-sm text-[var(--color-muted)]">—</span>
                              )}
                            </div>
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
                        </div>
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
