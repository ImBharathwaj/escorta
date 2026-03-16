"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BlurredImage } from "@/components/BlurredImage";
import { TipButton } from "@/components/TipButton";

type Message = {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; role: string };
};

type BookingTip = { id: string; amount: number; clientName: string; createdAt: string };

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [escortId, setEscortId] = useState<string | null>(null);
  const [clientIdForEscort, setClientIdForEscort] = useState<string | null>(null);
  const [activeVideoCall, setActiveVideoCall] = useState<{ id: string; other: { id: string; name: string } } | null>(null);
  const [videoCallLoading, setVideoCallLoading] = useState(false);
  const [pendingVideoRequestId, setPendingVideoRequestId] = useState<string | null>(null);
  const [pendingVideoRequests, setPendingVideoRequests] = useState<{ id: string; clientId: string; clientName: string }[]>([]);
  const [bookingTips, setBookingTips] = useState<BookingTip[]>([]);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const seenBookingTipIdsRef = useRef<Set<string>>(new Set());
  const bookingTipRemoveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
          setEscortId(conn.escort?.id ?? conn.escortId ?? null);
        } else {
          setEscortId(null);
          setClientIdForEscort(conn.client?.id ?? null);
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
    if (!token) return;
    const fetchActive = () =>
      fetch("/api/video-call/active", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setActiveVideoCall(data.session ?? null))
        .catch(() => setActiveVideoCall(null));
    fetchActive();
    const interval = setInterval(fetchActive, 4000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token || user?.role !== "escort") return;
    const fetchRequests = () =>
      fetch("/api/video-call/requests", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setPendingVideoRequests(data.requests ?? []))
        .catch(() => setPendingVideoRequests([]));
    fetchRequests();
    const interval = setInterval(fetchRequests, 4000);
    return () => clearInterval(interval);
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== "client" || !escortId) return;
    fetch(`/api/video-call/requests?escortId=${encodeURIComponent(escortId)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const requests = data.requests ?? [];
        const pending = requests.find((r: { status: string }) => r.status === "pending");
        if (pending) setPendingVideoRequestId(pending.id);
      })
      .catch(() => {});
  }, [token, user?.role, escortId]);

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
          if (data.currentUserId) setCurrentUserId(data.currentUserId);
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

  useEffect(() => {
    if (!token || user?.role !== "escort") return;
    seenBookingTipIdsRef.current = new Set();
    const fetchTips = () => {
      fetch(`/api/bookings/${id}/tips`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const tips = Array.isArray(d.tips) ? d.tips : [];
          const seen = seenBookingTipIdsRef.current;
          const newOnes = tips.filter((t: BookingTip) => !seen.has(t.id));
          if (!newOnes.length) return;
          newOnes.forEach((t: BookingTip) => seen.add(t.id));
          const DURATION = 5000;
          setBookingTips((prev) => [...prev, ...newOnes]);
          newOnes.forEach((t: BookingTip) => {
            const tid = setTimeout(
              () => setBookingTips((p) => p.filter((x) => x.id !== t.id)),
              DURATION
            );
            if (bookingTipRemoveTimeoutsRef.current[t.id] != null) {
              clearTimeout(bookingTipRemoveTimeoutsRef.current[t.id]);
            }
            bookingTipRemoveTimeoutsRef.current[t.id] = tid;
          });
        })
        .catch(() => {});
    };
    fetchTips();
    const interval = setInterval(fetchTips, 4000);
    return () => {
      clearInterval(interval);
      Object.values(bookingTipRemoveTimeoutsRef.current).forEach(clearTimeout);
      bookingTipRemoveTimeoutsRef.current = {};
    };
  }, [token, user?.role, id]);

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

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!token || reporting) return;
    setReportMessage("");
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportType: "booking",
          referenceId: id,
          reason: reportReason.trim(),
        }),
      });
      if (res.ok) {
        setReportMessage("Thanks, your report has been submitted to our team.");
        setReportReason("");
      } else {
        const data = await res.json().catch(() => ({}));
        setReportMessage(data.error || "Could not submit report. Please try again.");
      }
    } finally {
      setReporting(false);
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
          <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-4 relative">
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
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-light text-[var(--color-ivory)]">
                Chat with {otherName || "..."}
              </h1>
              <p className="text-xs text-[var(--color-silver)] mt-1">
                For connection and arranging meetups
              </p>
              <p className="text-[0.7rem] text-[var(--color-muted)] mt-1 max-w-md">
                Safety tip: keep chat inside Escorta, don&apos;t share phone numbers, socials, or payment links, and if
                anything feels off you can end the chat and block/report this user.
              </p>
            </div>
            {user?.role === "client" && canSend && escortId && (
              (() => {
                if (activeVideoCall && activeVideoCall.other.id === escortId) {
                  return (
                    <Link
                      href={`/video-call/${activeVideoCall.id}`}
                      className="flex-shrink-0 px-3 py-2 text-sm border border-green-500/70 text-green-300 hover:bg-green-500/20 transition"
                    >
                      Join video call
                    </Link>
                  );
                }
                if (pendingVideoRequestId) {
                  return (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-[var(--color-silver)]">Waiting for acceptance…</span>
                      <button
                        type="button"
                        disabled={videoCallLoading}
                        onClick={async () => {
                          if (!token || !pendingVideoRequestId) return;
                          setVideoCallLoading(true);
                          try {
                            await fetch(`/api/video-call/request/${pendingVideoRequestId}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                            setPendingVideoRequestId(null);
                          } finally {
                            setVideoCallLoading(false);
                          }
                        }}
                        className="px-2 py-1 text-xs border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-charcoal)] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  );
                }
                return (
                  <button
                    type="button"
                    disabled={videoCallLoading}
                    onClick={async () => {
                      if (!token || !escortId) return;
                      setVideoCallLoading(true);
                      try {
                        const res = await fetch("/api/video-call/request", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ escortId }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.requestId) {
                          setPendingVideoRequestId(data.requestId);
                        }
                      } finally {
                        setVideoCallLoading(false);
                      }
                    }}
                    className="flex-shrink-0 px-3 py-2 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50 transition"
                  >
                    {videoCallLoading ? "Sending…" : "Request video call"}
                  </button>
                );
              })()
            )}
            {!blocked && (
              <button
                type="button"
                disabled={blocking}
                onClick={async () => {
                  if (!token || !id || blocking) return;
                  if (!confirm("Block this user? You won't be able to message or connect with them again.")) return;
                  setBlocking(true);
                  try {
                    const res = await fetch(`/api/bookings/${id}/block`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      setBlocked(true);
                      router.push("/dashboard");
                    }
                  } finally {
                    setBlocking(false);
                  }
                }}
                className="flex-shrink-0 px-2 py-1.5 text-xs border border-red-500/60 text-red-300/90 hover:bg-red-500/10 disabled:opacity-50 transition"
              >
                {blocking ? "Blocking…" : "Block"}
              </button>
            )}
            {user?.role === "client" && canSend && (
              <TipButton
                context="booking"
                referenceId={id}
                recipientName={otherName || "Companion"}
                token={token}
                onSuccess={refreshUser}
                className="flex-shrink-0 px-3 py-2 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
              />
            )}
            {user?.role === "escort" && (() => {
              const fromThisClient = clientIdForEscort ? pendingVideoRequests.filter((r: { clientId: string }) => r.clientId === clientIdForEscort) : [];
              const hasActiveWithThisClient = activeVideoCall && activeVideoCall.other.id === clientIdForEscort;
              if (hasActiveWithThisClient) {
                return (
                  <Link
                    href={`/video-call/${activeVideoCall.id}`}
                    className="flex-shrink-0 px-3 py-2 text-sm border border-green-500/70 text-green-300 hover:bg-green-500/20 transition"
                  >
                    Join video call
                  </Link>
                );
              }
              if (fromThisClient.length > 0) {
                const req = fromThisClient[0];
                return (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[var(--color-silver)]">{req.clientName} wants to video call</span>
                    <button
                      type="button"
                      disabled={videoCallLoading}
                      onClick={async () => {
                        if (!token || !req.id) return;
                        setVideoCallLoading(true);
                        try {
                          const res = await fetch(`/api/video-call/request/${req.id}/decline`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                          if (res.ok) setPendingVideoRequests((prev) => prev.filter((p: { id: string }) => p.id !== req.id));
                        } finally {
                          setVideoCallLoading(false);
                        }
                      }}
                      className="px-2 py-1 text-xs border border-red-500/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={videoCallLoading}
                      onClick={async () => {
                        if (!token || !req.id) return;
                        setVideoCallLoading(true);
                        try {
                          const res = await fetch(`/api/video-call/request/${req.id}/accept`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                          const data = await res.json().catch(() => ({}));
                          if (res.ok && data.session?.id) {
                            router.push(`/video-call/${data.session.id}`);
                          }
                        } finally {
                          setVideoCallLoading(false);
                        }
                      }}
                      className="px-2 py-1 text-xs border border-green-500/70 text-green-300 hover:bg-green-500/20 disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                );
              }
              return null;
            })()}
            {user?.role === "escort" && bookingTips.length > 0 && (
              <div className="absolute top-2 right-3 flex flex-col gap-2 max-w-[260px] pointer-events-none">
                {bookingTips.map((t) => (
                  <div
                    key={t.id}
                    className="px-3 py-2 rounded bg-[var(--color-obsidian)]/95 border border-[var(--color-champagne)]/60 shadow-lg"
                  >
                    <p className="text-xs font-medium text-[var(--color-champagne)]">
                      {t.clientName} tipped you
                    </p>
                    <p className="text-xs text-[var(--color-ivory)]">
                      {t.amount} credit{t.amount !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
              messages.map((m) => {
                const isMe = m.sender.id === (currentUserId || user?.id);
                return (
                <div
                  key={m.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-sm ${
                      isMe
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
              ); })
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

        <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-charcoal)]/80">
          <details className="text-xs text-[var(--color-muted)]">
            <summary className="cursor-pointer select-none text-[var(--color-silver)]">
              Something feels off? Report this chat.
            </summary>
            <form onSubmit={handleReport} className="mt-2 space-y-2">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={2}
                className="w-full px-2 py-1 bg-[var(--color-obsidian)] border border-[var(--color-border)] rounded-sm text-[var(--color-ivory)] text-xs"
                placeholder="Optional: briefly describe what happened."
              />
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-3 py-1 text-[0.7rem] tracking-widest uppercase border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50 rounded-sm"
                >
                  {reporting ? "Sending…" : "Report"}
                </button>
                {reportMessage && (
                  <p className="text-[0.7rem] text-[var(--color-silver)] max-w-xs text-right">{reportMessage}</p>
                )}
              </div>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
