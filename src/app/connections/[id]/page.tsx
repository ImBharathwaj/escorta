"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BlurredImage } from "@/components/BlurredImage";

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

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, refreshUser, authReady } = useAuth();
  const id = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState("");
  const [otherImageUrl, setOtherImageUrl] = useState<string | null>(null);
  const [otherPhotoId, setOtherPhotoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [messageError, setMessageError] = useState("");
  const [canSend, setCanSend] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/connections/" + id);
      return;
    }
  }, [token, authReady, router, id]);

  useEffect(() => {
    if (!token || !id) return;
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const conn = (data.bookings || []).find(
          (b: { id: string; status: string }) => b.id === id
        );
        if (!conn) {
          router.push("/dashboard");
          return;
        }
        if (conn.status !== "accepted" && conn.status !== "cancelled") {
          router.push("/dashboard");
          return;
        }
        setCanSend(conn.status === "accepted");
        if (user?.role === "client") {
          setOtherName(conn.escort?.aliasName ?? "Companion");
          setOtherPhotoId(conn.escort?.primaryPhotoId ?? null);
          setOtherImageUrl(null);
        } else {
          setOtherName(
            (conn.client?.displayName || conn.client?.email) ?? "Member"
          );
          setOtherImageUrl(conn.client?.avatarSignedUrl ?? null);
          setOtherPhotoId(null);
        }
      })
      .catch(() => router.push("/dashboard"));
  }, [token, id, user?.role, router]);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    prevMessageCountRef.current = 0;
    const fetchMessages = () => {
      fetch(`/api/bookings/${id}/messages?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          const next = data.messages || [];
          setMessages((prev) => mergeMessages(prev, next));
          if (typeof data.canSend === "boolean") setCanSend(data.canSend);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [token, id]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length > prev) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || sending) return;
    setMessageError("");
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${id}/messages`, {
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
        refreshUser();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessageError(data.error || "Failed to send");
        if (res.status === 402) refreshUser();
      }
    } finally {
      setSending(false);
    }
  }

  if (!token) return null;

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-6">
        <Link
          href="/dashboard"
          className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 transition"
        >
          ← Back to account
        </Link>

        <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded-sm flex-1 flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
              {otherPhotoId ? (
                <BlurredImage
                  photoId={otherPhotoId}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : otherImageUrl ? (
                <img
                  src={otherImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <span className="text-lg text-[var(--color-muted)]">—</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-light text-[var(--color-ivory)]">
                Chat with {otherName || "..."}
              </h1>
              <p className="text-xs text-[var(--color-silver)] mt-1">
                For connection and arranging meetups
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-[var(--color-silver)] font-light text-sm">
                Loading...
              </p>
            ) : messages.length === 0 ? (
              <p className="text-[var(--color-muted)] font-light text-sm">
                No messages yet. Say hello to start the conversation.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender.id === user?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-sm ${
                      m.sender.id === user?.id
                        ? "bg-[var(--color-champagne)]/20 border border-[var(--color-champagne)]/40 text-[var(--color-ivory)]"
                        : "bg-[var(--color-slate)] border border-[var(--color-border)] text-[var(--color-pearl)]"
                    }`}
                  >
                    <p className="text-sm font-light whitespace-pre-wrap">
                      {m.message}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-[var(--color-border)]">
            {!canSend && (
              <p className="text-sm text-[var(--color-silver)] font-light mb-3">
                No longer connected. Message history is shown for reference
                only.
              </p>
            )}
            <form
              onSubmit={handleSubmit}
              className={canSend ? "" : "opacity-60 pointer-events-none"}
            >
              {messageError && (
                <p className="text-sm text-red-300/90 mb-2">{messageError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    canSend ? "Type a message..." : "Sending disabled"
                  }
                  maxLength={2000}
                  disabled={!canSend}
                  className="flex-1 px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition rounded-sm disabled:opacity-70"
                />
                <button
                  type="submit"
                  disabled={!canSend || !input.trim() || sending}
                  className="px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 rounded-sm"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
