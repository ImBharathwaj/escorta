"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type SexterMessage = {
  id: string;
  message: string;
  createdAt: string;
  sender: { id: string; role: string };
  attachmentUrl?: string | null;
  attachmentType?: string | null;
};

function mergeSexterMessages(prev: SexterMessage[], next: SexterMessage[]): SexterMessage[] {
  if (!next?.length) return prev;
  if (!prev?.length) return next;
  const byId = new Map(prev.map((m) => [m.id, m]));
  const merged = next.map((m) => byId.get(m.id) ?? m);
  if (merged.length === prev.length && merged.every((m, i) => m === prev[i])) return prev;
  return merged;
}

export default function SexterClientChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, authReady } = useAuth();
  const clientId = params.clientId as string;
  const [messages, setMessages] = useState<SexterMessage[]>([]);
  const [otherName, setOtherName] = useState("");
  const [otherImageUrl, setOtherImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [sexterSession, setSexterSession] = useState<{ id: string; createdAt: string; expiresAt?: string } | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [endingSession, setEndingSession] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/sexter/client/" + clientId);
      return;
    }
    if (user?.role !== "escort") router.push("/sexter");
  }, [authReady, token, user?.role, clientId, router]);

  useEffect(() => {
    if (!token || !clientId || user?.role !== "escort") {
      setLoading(false);
      return;
    }
    setLoading(true);
    prevMessageCountRef.current = 0;
    const fetchSexter = () => {
      fetch(`/api/sexter/client/${encodeURIComponent(clientId)}?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data) => {
          const next = Array.isArray(data?.messages) ? data.messages : [];
          setMessages((prev) => mergeSexterMessages(prev, next));
          if (typeof data?.canSend === "boolean") setCanSend(data.canSend);
          setSexterSession(data?.session ?? null);
          setExpiresAt(data?.expiresAt ?? null);
          if (typeof data?.isExpired === "boolean") setIsExpired(data.isExpired);
          if (data?.otherName) setOtherName(data.otherName);
          if (data?.otherImageUrl !== undefined) setOtherImageUrl(data.otherImageUrl);
        })
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    };
    fetchSexter();
    const interval = setInterval(fetchSexter, 10000);
    return () => clearInterval(interval);
  }, [token, clientId, user?.role]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length > prev) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasText = input.trim().length > 0;
    const hasFile = !!attachmentFile;
    if ((!hasText && !hasFile) || !token || sending) return;
    setSendError("");
    setSending(true);
    try {
      let res: Response;
      if (hasFile && attachmentFile) {
        const form = new FormData();
        form.set("message", input.trim());
        form.set("file", attachmentFile);
        res = await fetch(`/api/sexter/client/${encodeURIComponent(clientId)}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        setAttachmentFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        res = await fetch(`/api/sexter/client/${encodeURIComponent(clientId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: input.trim() }),
        });
      }
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
        fetch(`/api/sexter/client/${encodeURIComponent(clientId)}?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
          .then((r) => r.json())
          .then((data) => {
            setSexterSession(data.session ?? null);
            setExpiresAt(data.expiresAt ?? null);
            setIsExpired(!!data.isExpired);
            setCanSend(!!data.canSend);
          })
          .catch(() => {});
      } else {
        const data = await res.json().catch(() => ({}));
        setSendError(data.error || "Failed to send");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleEndSession() {
    if (!token || !clientId || endingSession) return;
    setEndingSession(true);
    try {
      const res = await fetch(`/api/sexter/client/${encodeURIComponent(clientId)}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSexterSession(null);
        setMessages([]);
        setExpiresAt(null);
        setCanSend(false);
      }
    } finally {
      setEndingSession(false);
    }
  }

  if (!token || user?.role !== "escort") return null;

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-6">
        <Link href="/sexter" className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 transition">
          ← Back to Sexter
        </Link>
        <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded-sm flex-1 flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
              {otherImageUrl ? (
                <img src={otherImageUrl} alt="" className="w-full h-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
              ) : (
                <span className="text-lg text-[var(--color-muted)]">—</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-light text-[var(--color-ivory)]">Sexter with {otherName || "..."}</h1>
              <p className="text-xs text-[var(--color-silver)] mt-1">Sexter is separate from connection. Client uses credits; session content deleted when session ends.</p>
              {expiresAt && isExpired && <p className="text-xs mt-1 text-[var(--color-muted)]">Session expired. Client can extend.</p>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && messages.length === 0 ? (
              <p className="text-[var(--color-silver)] font-light text-sm">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="text-[var(--color-muted)] font-light text-sm">No active session. Client starts the session with credits.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender.id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-sm ${m.sender.id === user?.id ? "bg-[var(--color-champagne)]/20 border border-[var(--color-champagne)]/40 text-[var(--color-ivory)]" : "bg-[var(--color-slate)] border border-[var(--color-border)] text-[var(--color-pearl)]"}`}>
                    {m.attachmentUrl && (m.attachmentType === "video" ? (
                      <video src={m.attachmentUrl} controls className="max-w-full max-h-64 rounded object-contain mb-2 max-w-[280px]" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                    ) : (
                      <img src={m.attachmentUrl} alt="" className="max-w-full max-h-64 rounded object-contain mb-2 max-w-[280px]" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                    ))}
                    {m.message ? <p className="text-sm font-light whitespace-pre-wrap">{m.message}</p> : null}
                    <p className="text-[10px] text-[var(--color-muted)] mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-4 border-t border-[var(--color-border)]">
            {sexterSession && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button type="button" onClick={handleEndSession} disabled={endingSession} className="text-xs tracking-wider uppercase border border-red-400/60 text-red-300/90 hover:bg-red-400/10 px-3 py-2 rounded-sm disabled:opacity-50">
                  {endingSession ? "Ending…" : "End session"}
                </button>
              </div>
            )}
            {sendError && <p className="text-sm text-red-300/90 mb-2">{sendError}</p>}
            {canSend && <p className="text-xs text-[var(--color-silver)] font-light mb-1">Reply with text, images or videos.</p>}
            <form onSubmit={handleSubmit} className={canSend ? "" : "opacity-60 pointer-events-none"}>
              {canSend && (
                <div className="flex items-center gap-2 mb-2">
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs tracking-wider uppercase border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] px-3 py-2 rounded-sm">
                    {attachmentFile ? attachmentFile.name : "+ Image/Video"}
                  </button>
                  {attachmentFile && (
                    <button type="button" onClick={() => { setAttachmentFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ivory)]">Clear</button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={canSend ? "Type a message or attach media..." : "Session ended"} maxLength={2000} disabled={!canSend} className="flex-1 px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition rounded-sm disabled:opacity-70" />
                <button type="submit" disabled={!canSend || sending || (!input.trim() && !attachmentFile)} className="px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 rounded-sm">Send</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
