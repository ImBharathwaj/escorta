"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Message = {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; role: string };
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const id = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login?redirect=/connections/" + id);
      return;
    }
  }, [token, router, id]);

  useEffect(() => {
    if (!token || !id) return;
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const conn = (data.bookings || []).find((b: { id: string }) => b.id === id);
        if (!conn || conn.status !== "accepted") {
          router.push("/dashboard");
          return;
        }
        if (user?.role === "client") {
          setOtherName(conn.escort?.aliasName ?? "Companion");
        } else {
          setOtherName(conn.client?.email ?? "Member");
        }
      })
      .catch(() => router.push("/dashboard"));
  }, [token, id, user?.role, router]);

  useEffect(() => {
    if (!token || !id) return;
    const fetchMessages = () => {
      fetch(`/api/bookings/${id}/messages?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          setMessages(data.messages || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [token, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || sending) return;
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
          <div className="p-4 border-b border-[var(--color-border)]">
            <h1 className="text-lg font-light text-[var(--color-ivory)]">
              Chat with {otherName || "..."}
            </h1>
            <p className="text-xs text-[var(--color-silver)] mt-1">
              Arrange meetups and stay in touch
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-[var(--color-silver)] font-light text-sm">Loading...</p>
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
                    <p className="text-sm font-light whitespace-pre-wrap">{m.message}</p>
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--color-border)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={2000}
                className="flex-1 px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition rounded-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 rounded-sm"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
