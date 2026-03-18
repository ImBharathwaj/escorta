"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BlurredImage } from "@/components/BlurredImage";

type SexterMessage = {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; role: string };
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  blurredForClient?: boolean;
};

function mergeSexterMessages(prev: SexterMessage[], next: SexterMessage[]): SexterMessage[] {
  if (!next?.length) return prev;
  if (!prev?.length) return next;
  const byId = new Map(prev.map((m) => [m.id, m]));
  const merged = next.map((m) => {
    const existing = byId.get(m.id);
    if (!existing) return m;
    if (existing.blurredForClient !== m.blurredForClient) return m;
    return existing;
  });
  if (merged.length === prev.length && merged.every((m, i) => m === prev[i])) return prev;
  return merged;
}

export default function SexterEscortChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, refreshUser, authReady } = useAuth();
  const escortId = params.escortId as string;
  const [messages, setMessages] = useState<SexterMessage[]>([]);
  const [otherName, setOtherName] = useState("");
  const [otherPhotoId, setOtherPhotoId] = useState<string | null>(null);
  const [otherPhotoUrl, setOtherPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState("");
  const [showGetCreditsPrompt, setShowGetCreditsPrompt] = useState(false);
  const [extendNeedCredits, setExtendNeedCredits] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [sexterSession, setSexterSession] = useState<{ id: string; createdAt: string; expiresAt?: string } | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/sexter/escort/" + escortId);
      return;
    }
    if (user?.role !== "client") router.push("/sexter");
  }, [authReady, token, user?.role, escortId, router]);

  useEffect(() => {
    if (!token || !escortId || user?.role !== "client") return;
    setLoading(true);
    prevMessageCountRef.current = 0;
    const fetchSexter = () => {
      fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          const next = data.messages || [];
          setMessages((prev) => mergeSexterMessages(prev, next));
          if (typeof data.canSend === "boolean") setCanSend(data.canSend);
          setSexterSession(data.session ?? null);
          setExpiresAt(data.expiresAt ?? null);
          if (typeof data.isExpired === "boolean") setIsExpired(data.isExpired);
          if (data.otherName) setOtherName(data.otherName);
          if (data.otherPhotoId !== undefined) setOtherPhotoId(data.otherPhotoId);
          if (data.otherPhotoUrl !== undefined) setOtherPhotoUrl(data.otherPhotoUrl);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetchSexter();
    const interval = setInterval(fetchSexter, 10000);
    return () => clearInterval(interval);
  }, [token, escortId, user?.role]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length > prev) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sessionEndsAt = expiresAt ? new Date(expiresAt).getTime() : null;
  useEffect(() => {
    if (!sessionEndsAt) {
      setTimeLeft(null);
      return;
    }
    const update = () => {
      const now = Date.now();
      if (now >= sessionEndsAt) {
        setTimeLeft("0:00");
        return;
      }
      const s = Math.floor((sessionEndsAt - now) / 1000);
      const m = Math.floor(s / 60);
      setTimeLeft(`${m}:${String(s % 60).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [sessionEndsAt, expiresAt]);

  async function handleExtend() {
    if (!token || !escortId || extending) return;
    setExtendError("");
    setExtendNeedCredits(false);
    setExtending(true);
    try {
      const res = await fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}/extend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setExpiresAt(data.expiresAt ?? null);
        setIsExpired(false);
        setCanSend(true);
        refreshUser();
        fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
          .then((r) => r.json())
          .then((d) => {
            if (Array.isArray(d.messages)) setMessages(d.messages);
          })
          .catch(() => {});
      } else {
        if (res.status === 402 && data.code === "NEED_CREDITS") {
          setExtendError(data.message || data.error || "");
          setExtendNeedCredits(true);
        } else {
          setExtendError(data.error || "Failed to extend");
        }
        if (res.status === 402) refreshUser();
      }
    } finally {
      setExtending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasText = input.trim().length > 0;
    const hasFile = !!attachmentFile;
    if ((!hasText && !hasFile) || !token || sending) return;
    setSendError("");
    setShowGetCreditsPrompt(false);
    setSending(true);
    try {
      let res: Response;
      if (hasFile && attachmentFile) {
        const form = new FormData();
        form.set("message", input.trim());
        form.set("file", attachmentFile);
        res = await fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        setAttachmentFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        res = await fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: input.trim() }),
        });
      }
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
        setSexterSession((s) => s || { id: "", createdAt: new Date().toISOString() });
        fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
          .then((r) => r.json())
          .then((data) => {
            setSexterSession(data.session ?? null);
            setExpiresAt(data.expiresAt ?? null);
            setIsExpired(!!data.isExpired);
            if (Array.isArray(data.messages)) setMessages(data.messages);
          })
          .catch(() => {});
        refreshUser();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 && data.code === "NEED_CREDITS") {
          setSendError(data.message || data.error || "");
          setShowGetCreditsPrompt(true);
        } else {
          setSendError(data.error || "Failed to send");
        }
        if (res.status === 402) refreshUser();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleEndSession() {
    if (!token || !escortId || endingSession) return;
    setEndingSession(true);
    try {
      const res = await fetch(`/api/sexter/escort/${encodeURIComponent(escortId)}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSexterSession(null);
        setMessages([]);
        setExpiresAt(null);
        setIsExpired(false);
        setCanSend(false);
      }
    } finally {
      setEndingSession(false);
    }
  }

  if (!token || user?.role !== "client") return null;

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-3 sm:px-6">
        <Link href="/sexter" className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-4 sm:mb-6 transition">
          ← Back
        </Link>
        <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded-sm flex-1 flex flex-col min-h-0">
          <div className="p-3 sm:p-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
              {otherPhotoId ? (
                <BlurredImage photoId={otherPhotoId} alt="" className="w-full h-full object-cover" aspect="thumbnail" skipPremiumOverlay />
              ) : otherPhotoUrl ? (
                <img
                  src={otherPhotoUrl}
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
              <h1 className="text-base sm:text-lg font-light text-[var(--color-ivory)] truncate">{otherName || "..."}</h1>
              {expiresAt && (
                <p className="text-xs mt-0.5 text-[var(--color-champagne)]/90">
                  {isExpired ? "Session expired. Extend to continue." : <>Ends in <strong>{timeLeft ?? "—"}</strong></>}
                </p>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && messages.length === 0 ? (
              <p className="text-[var(--color-silver)] font-light text-sm">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="text-[var(--color-muted)] font-light text-sm">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender.id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`relative max-w-[80%] px-4 py-2 rounded-sm ${m.sender.id === user?.id ? "bg-[var(--color-champagne)]/20 border border-[var(--color-champagne)]/40 text-[var(--color-ivory)]" : "bg-[var(--color-slate)] border border-[var(--color-border)] text-[var(--color-pearl)]"}`}>
                    {m.blurredForClient ? (
                      <div className="relative select-none pointer-events-none">
                        {m.attachmentUrl && (m.attachmentType === "video" ? (
                          <video src={m.attachmentUrl} className="max-w-full max-h-64 rounded object-contain mb-2 max-w-[280px] blur-lg scale-105" muted playsInline draggable={false} onContextMenu={(e) => e.preventDefault()} />
                        ) : (
                          <img src={m.attachmentUrl} alt="" className="max-w-full max-h-64 rounded object-contain mb-2 max-w-[280px] blur-lg scale-105" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                        ))}
                        {m.message ? <p className="text-sm font-light whitespace-pre-wrap blur-md">{m.message}</p> : null}
                        <p className="text-[10px] text-[var(--color-muted)] mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                        <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-[var(--color-obsidian)]/50">
                          <p className="text-xs text-[var(--color-champagne)] px-4 text-center font-medium">Start a new session to view</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {m.attachmentUrl && (m.attachmentType === "video" ? (
                          <video src={m.attachmentUrl} controls className="max-w-full max-h-64 rounded object-contain mb-2 max-w-[280px]" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                        ) : (
                          <img src={m.attachmentUrl} alt="" className="max-w-full max-h-64 rounded object-contain mb-2 max-w-[280px]" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                        ))}
                        {m.message ? <p className="text-sm font-light whitespace-pre-wrap">{m.message}</p> : null}
                        <p className="text-[10px] text-[var(--color-muted)] mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 sm:p-4 border-t border-[var(--color-border)]">
            {sexterSession && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                <button type="button" onClick={handleExtend} disabled={extending} className="text-[10px] sm:text-xs tracking-wider uppercase border border-[var(--color-champagne)]/60 text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 px-2 py-1.5 sm:px-3 sm:py-2 rounded-sm disabled:opacity-50">
                  {extending ? "Extending…" : "Extend (+5 min)"}
                </button>
                <button type="button" onClick={handleEndSession} disabled={endingSession} className="text-[10px] sm:text-xs tracking-wider uppercase border border-red-400/60 text-red-300/90 hover:bg-red-400/10 px-2 py-1.5 sm:px-3 sm:py-2 rounded-sm disabled:opacity-50">
                  {endingSession ? "Ending…" : "End session"}
                </button>
              </div>
            )}
            {extendError && (
              <div className="mb-2">
                {extendNeedCredits ? (
                  <div className="p-2 sm:p-3 rounded-sm border border-[var(--color-champagne)]/40 bg-[var(--color-champagne)]/10">
                    <p className="text-sm text-[var(--color-ivory)] font-light mb-2">{extendError}</p>
                    <Link href="/membership" className="inline-block text-xs tracking-wider uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] px-3 py-2 rounded-sm transition">Get credits</Link>
                  </div>
                ) : (
                  <p className="text-sm text-red-300/90">{extendError}</p>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className={canSend ? "" : "opacity-60 pointer-events-none"}>
              {showGetCreditsPrompt && sendError && (
                <div className="mb-3 p-2 sm:p-3 rounded-sm border border-[var(--color-champagne)]/40 bg-[var(--color-champagne)]/10">
                  <p className="text-sm text-[var(--color-ivory)] font-light mb-2">{sendError}</p>
                  <Link href="/membership" className="inline-block text-xs tracking-wider uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] px-3 py-2 rounded-sm transition">Get credits</Link>
                </div>
              )}
              {sendError && !showGetCreditsPrompt && <p className="text-sm text-red-300/90 mb-2">{sendError}</p>}
              <div className="flex items-center gap-2">
                {canSend && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach image or video" title={attachmentFile ? attachmentFile.name : "Image/Video"} className="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:border-[var(--color-champagne)]/40 transition">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.07-7.07a4 4 0 00-5.656-5.656L5.757 10.76a6 6 0 008.486 8.486L20.5 13" /></svg>
                    </button>
                  </>
                )}
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={canSend ? "Type a message…" : "Sending disabled"} maxLength={2000} disabled={!canSend} className="flex-1 min-w-0 px-3 py-2.5 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm focus:border-[var(--color-champagne)]/50 transition rounded-sm disabled:opacity-70" />
                <button type="submit" disabled={!canSend || sending || (!input.trim() && !attachmentFile)} className="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
              {attachmentFile && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--color-silver)]">
                  <span className="truncate max-w-[200px]">{attachmentFile.name}</span>
                  <button type="button" onClick={() => { setAttachmentFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-[var(--color-muted)] hover:text-[var(--color-ivory)]">×</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
