"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CONNECT_CREDITS } from "@/lib/credits";
import { trackEvent } from "@/lib/analytics";

function ConnectActions({
  escortId,
  escortName,
  connectionId,
}: {
  escortId: string;
  escortName: string;
  connectionId: string;
}) {
  const router = useRouter();
  const { token, refreshUser } = useAuth();
  const [videoCallLoading, setVideoCallLoading] = useState(false);
  const [videoCallError, setVideoCallError] = useState("");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  const checkPendingAndActive = useCallback(async () => {
    if (!token || !escortId) return;
    const [reqRes, activeRes] = await Promise.all([
      fetch(`/api/video-call/requests?escortId=${encodeURIComponent(escortId)}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/video-call/active", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const reqData = await reqRes.json().catch(() => ({}));
    const activeData = await activeRes.json().catch(() => ({}));
    const requests = reqData.requests ?? [];
    const pending = requests.find((r: { status: string }) => r.status === "pending");
    if (pending) setPendingRequestId(pending.id);
    else setPendingRequestId(null);
    if (activeData.session?.id) {
      router.push(`/video-call/${activeData.session.id}`);
    }
  }, [token, escortId, router]);

  useEffect(() => {
    if (!pendingRequestId) return;
    const t = setInterval(checkPendingAndActive, 3000);
    return () => clearInterval(t);
  }, [pendingRequestId, checkPendingAndActive]);

  useEffect(() => {
    if (!token || !escortId) return;
    checkPendingAndActive();
  }, [token, escortId, checkPendingAndActive]);

  async function requestVideoCall() {
    if (!token) return;
    setVideoCallError("");
    setVideoCallLoading(true);
    try {
      const res = await fetch("/api/video-call/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ escortId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NEED_CREDITS") {
          setVideoCallError("Not enough credits.");
        } else {
          setVideoCallError(data.error || "Failed to send request");
        }
        return;
      }
      if (data.requestId) setPendingRequestId(data.requestId);
    } finally {
      setVideoCallLoading(false);
    }
  }

  async function cancelRequest() {
    if (!token || !pendingRequestId) return;
    setVideoCallLoading(true);
    try {
      await fetch(`/api/video-call/request/${pendingRequestId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequestId(null);
    } finally {
      setVideoCallLoading(false);
    }
  }

  return (
    <div className="lg:sticky lg:top-24 space-y-3">
      <Link
        href={`/connections/${connectionId}`}
        className="block border border-[var(--color-champagne)] bg-[var(--color-champagne)]/10 p-4 sm:p-6 rounded-sm text-center text-[var(--color-ivory)] font-light hover:bg-[var(--color-champagne)]/20 hover:border-[var(--color-champagne)]/60 transition"
      >
        <span className="text-sm tracking-widest uppercase text-[var(--color-champagne)] block mb-1">
          Connected
        </span>
        <span className="text-lg">
          Continue chatting with {escortName}
        </span>
      </Link>
      <div className="flex flex-col gap-2">
        {videoCallError && (
          <p className="text-sm text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-sm p-2">
            {videoCallError}
          </p>
        )}
        {pendingRequestId ? (
          <div className="border border-[var(--color-silver)]/40 bg-[var(--color-charcoal)] p-4 rounded-sm space-y-2">
            <p className="text-sm text-[var(--color-ivory)] font-light">
              Waiting for {escortName} to accept…
            </p>
            <button
              type="button"
              onClick={cancelRequest}
              disabled={videoCallLoading}
              className="w-full py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-obsidian)] disabled:opacity-50 rounded-sm"
            >
              Cancel request
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={requestVideoCall}
            disabled={videoCallLoading}
            className="w-full py-3 text-sm tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-ivory)] hover:bg-[var(--color-charcoal)] hover:border-[var(--color-silver)] transition disabled:opacity-50 rounded-sm"
          >
            {videoCallLoading ? "Sending…" : "Request video call"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConnectForm({
  escortId,
  escortName,
}: {
  escortId: string;
  escortName: string;
}) {
  const router = useRouter();
  const { user, token, refreshUser } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [existingConnection, setExistingConnection] = useState<{ id: string; status: string } | null>(null);
  const retryRef = useRef(false);

  const fetchConnection = useCallback(() => {
    if (!token || user?.role !== "client") {
      setConnectionLoading(false);
      return;
    }
    setConnectionLoading(true);
    const idToMatch = String(escortId).trim();
    fetch("/api/bookings", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        const raw = data?.bookings ?? data ?? [];
        const list = Array.isArray(raw) ? raw : [];
        const forThisEscort = list.filter(
          (b: { escort?: { id: string }; escortId?: string }) => {
            const eid = (b.escort?.id ?? b.escortId ?? "").toString().trim();
            return eid && eid === idToMatch;
          }
        );
        const accepted = forThisEscort.find((b: { status: string }) => b.status === "accepted");
        const pending = forThisEscort.find((b: { status: string }) => b.status === "pending");
        const rejected = forThisEscort.find((b: { status: string }) => b.status === "rejected");
        const conn = accepted ?? pending ?? rejected;
        setExistingConnection(conn ? { id: conn.id, status: conn.status } : null);
      })
      .catch(() => setExistingConnection(null))
      .finally(() => setConnectionLoading(false));
  }, [token, user?.role, escortId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  useEffect(() => {
    if (user?.role !== "client") return;
    const onFocus = () => fetchConnection();
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchConnection();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.role, fetchConnection]);

  // If we're client and still showing connect form after load, refetch once in case of race/cache
  useEffect(() => {
    if (user?.role !== "client" || connectionLoading || existingConnection != null || retryRef.current) return;
    retryRef.current = true;
    const t = setTimeout(() => fetchConnection(), 600);
    return () => clearTimeout(t);
  }, [user?.role, connectionLoading, existingConnection, fetchConnection]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent("/escorts/" + escortId)}`);
      return;
    }

    const form = e.currentTarget;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement)?.value?.trim();

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          escort_id: escortId,
          message: message || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 402) await refreshUser();
        throw new Error(err.error || "Failed to connect");
      }
      await refreshUser();
      trackEvent("connection_request");
      router.push("/dashboard?connected=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  const formStyles =
    "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition rounded-sm";

  if (!user) {
    return (
      <div className="lg:sticky lg:top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-4 sm:p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Connect with {escortName}
        </h2>
        <div className="flex flex-col gap-2">
          <Link
            href={`/login?redirect=${encodeURIComponent("/escorts/" + escortId)}`}
            className="block w-full py-3 text-sm tracking-widest uppercase text-center border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition rounded-sm"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="block w-full py-3 text-sm tracking-widest uppercase text-center border border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-champagne)]/50 hover:text-[var(--color-ivory)] transition rounded-sm"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div className="lg:sticky lg:top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-4 sm:p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Connect with {escortName}
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm">
          Use a member account to connect with companions.
        </p>
      </div>
    );
  }

  if (connectionLoading) {
    return (
      <div className="lg:sticky lg:top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-4 sm:p-8 rounded-sm">
        <div className="animate-pulse text-[var(--color-silver)] font-light text-sm">
          Checking connection...
        </div>
      </div>
    );
  }

  if (existingConnection?.status === "accepted") {
    return (
      <ConnectActions
        escortId={escortId}
        escortName={escortName}
        connectionId={existingConnection.id}
      />
    );
  }

  if (existingConnection?.status === "pending") {
    return (
      <div className="lg:sticky lg:top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-4 sm:p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide">
          Request pending
        </h2>
      </div>
    );
  }

  if (existingConnection?.status === "rejected") {
    return (
      <div className="lg:sticky lg:top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-4 sm:p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide">
          Request declined
        </h2>
      </div>
    );
  }

  const credits = user?.credits ?? 0;
  const canConnect = credits >= CONNECT_CREDITS;

  return (
    <div className="lg:sticky lg:top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-4 sm:p-8 rounded-sm">
      <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
        Connect with {escortName}
      </h2>
      {!canConnect && (
        <div className="p-3 text-sm text-amber-200/90 border border-amber-500/30 bg-amber-500/10 rounded-sm mb-4">
          Not enough credits.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10 rounded-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
            Intro message (optional)
          </label>
          <textarea
            name="message"
            rows={3}
            placeholder="Say hello or share what you have in mind..."
            className={`${formStyles} resize-none`}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !canConnect}
          className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
        >
          {loading ? "Sending..." : "Connect"}
        </button>
      </form>
    </div>
  );
}
