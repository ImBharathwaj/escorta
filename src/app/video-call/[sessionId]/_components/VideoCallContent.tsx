"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant, LocalTrackPublication, LocalParticipant, DisconnectReason } from "livekit-client";
import { IconEndCall, IconExitFullscreen, IconExtend, IconFullscreen, IconTipCoin } from "@/components/icons/CallIcons";

type SessionInfo = {
  id: string;
  roomName: string;
  expiresAt: string;
  startedAt: string;
  other: { id: string; name: string };
};

function formatTimeLeft(expiresAt: string, clockOffsetMs: number): string {
  const end = new Date(expiresAt).getTime();
  const now = Date.now() + clockOffsetMs;
  const sec = Math.max(0, Math.floor((end - now) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCallContent() {
  const params = useParams();
  const router = useRouter();
  const { user, token, authReady, refreshUser } = useAuth();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [extending, setExtending] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const roomRef = useRef<Room | null>(null);
  type TipToast = { id: string; clientName: string; amount: number; createdAt: string };
  const [tipToasts, setTipToasts] = useState<TipToast[]>([]);
  const seenTipIdsRef = useRef<Set<string>>(new Set());
  const hasFetchedTipsOnceRef = useRef(false);
  const tipRemoveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [callEnded, setCallEnded] = useState(false);
  const [callExpired, setCallExpired] = useState(false);
  const autoEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [mediaStarting, setMediaStarting] = useState(false);
  const [mediaStarted, setMediaStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [otherLeft, setOtherLeft] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [tipFlash, setTipFlash] = useState(false);
  const clockOffsetRef = useRef(0);

  const fetchJoin = useCallback(() => {
    if (!token || !sessionId) return;
    setLoading(true);
    setError("");
    fetch(`/api/video-call/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          if (res.status === 410) router.replace("/dashboard");
          else setError(data.error);
          setSession(null);
          setLivekitToken(null);
          setLivekitUrl(null);
          return;
        }
        setSession(data.session);
        setLivekitToken(data.token);
        setLivekitUrl(data.url);
      })
      .catch(() => setError("Failed to load call"))
      .finally(() => setLoading(false));
  }, [token, sessionId, router]);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/video-call/" + sessionId);
      return;
    }
    fetchJoin();
  }, [authReady, token, sessionId, fetchJoin]);

  useEffect(() => {
    if (!token || !sessionId || callEnded) return;
    const handleUnload = () => {
      try {
        fetch(`/api/video-call/${sessionId}/end`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        });
      } catch { /* best effort */ }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [token, sessionId, callEnded]);

  useEffect(() => {
    if (!session?.expiresAt || callExpired || callEnded) return;
    const update = () => setTimeLeft(formatTimeLeft(session.expiresAt, clockOffsetRef.current));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session?.expiresAt, callExpired, callEnded]);

  const fetchVideoTips = useCallback(() => {
    if (!sessionId || !token || user?.role !== "escort") return;
    fetch(`/api/video-call/${sessionId}/tips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const tips = Array.isArray(d.tips) ? d.tips : [];
        const seen = seenTipIdsRef.current;
        const isFirst = !hasFetchedTipsOnceRef.current;
        if (isFirst) {
          hasFetchedTipsOnceRef.current = true;
          tips.forEach((t: TipToast) => seen.add(t.id));
          return;
        }
        const newTips = tips.filter((t: TipToast) => !seen.has(t.id));
        if (!newTips.length) return;
        newTips.forEach((t: TipToast) => seen.add(t.id));
        const DURATION_MS = 5000;
        setTipToasts((prev) => [...prev, ...newTips]);
        newTips.forEach((t: TipToast) => {
          const tid = setTimeout(
            () => setTipToasts((p) => p.filter((x) => x.id !== t.id)),
            DURATION_MS
          );
          if (tipRemoveTimeoutsRef.current[t.id] != null) {
            clearTimeout(tipRemoveTimeoutsRef.current[t.id]);
          }
          tipRemoveTimeoutsRef.current[t.id] = tid;
        });
      })
      .catch(() => {});
  }, [sessionId, token, user?.role]);

  useEffect(() => {
    if (!sessionId || user?.role !== "escort") return;
    seenTipIdsRef.current = new Set();
    hasFetchedTipsOnceRef.current = false;
    fetchVideoTips();
    const id = setInterval(fetchVideoTips, 4000);
    return () => {
      clearInterval(id);
      Object.values(tipRemoveTimeoutsRef.current).forEach(clearTimeout);
      tipRemoveTimeoutsRef.current = {};
    };
  }, [sessionId, user?.role, fetchVideoTips]);

  useEffect(() => {
    if (!livekitToken || !livekitUrl || !session || callEnded) return;
    let cancelled = false;
    setMediaStarted(false);
    setReconnecting(false);
    setOtherLeft(false);

    const connectRoom = () => {
      if (cancelled) return;
      const r = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = r;

      r.on(RoomEvent.Reconnecting, () => { if (!cancelled) setReconnecting(true); });
      r.on(RoomEvent.Reconnected, () => { if (!cancelled) setReconnecting(false); });
      r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (cancelled) return;
        setReconnecting(false);
        if (reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.ROOM_DELETED) {
          setCallEnded(true);
          setError("The call was ended.");
        }
      });
      r.on(RoomEvent.ParticipantDisconnected, () => {
        if (cancelled) return;
        setOtherLeft(true);
      });

      r.connect(livekitUrl, livekitToken)
        .then(() => {
          if (cancelled) { r.disconnect(); return; }
          setRoom(r);
        })
        .catch((err) => {
          if (cancelled) return;
          const raw = (err && typeof err.message === "string" ? err.message : "") || "";
          const lower = raw.toLowerCase();
          if (lower.includes("client initiated disconnect")) {
            setCallEnded(true);
            setError("The other person left the call.");
          } else {
            setError(raw || "Failed to connect");
          }
          setRoom(null);
          roomRef.current = null;
        });
    };

    const tid = setTimeout(connectRoom, 50);

    return () => {
      cancelled = true;
      clearTimeout(tid);
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [livekitToken, livekitUrl, session?.id, callEnded]);

  const startMedia = useCallback(async () => {
    const r = roomRef.current;
    if (!r || mediaStarting || mediaStarted) return;
    if (typeof window !== "undefined") {
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Camera & mic need a secure connection. Use HTTPS with a trusted certificate or http://localhost in development."
        );
        return;
      }
    }
    setError("");
    setMediaStarting(true);
    try {
      // Mobile browsers (especially iOS Safari) require a user gesture to start getUserMedia + audio playback.
      await r.localParticipant.enableCameraAndMicrophone();
      await r.startAudio?.();
      setMediaStarted(true);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Permission denied. Please allow camera & microphone and reload.";
      setError(msg);
    } finally {
      setMediaStarting(false);
    }
  }, [mediaStarting, mediaStarted]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const container = document.getElementById("video-call-stage");
      const remoteVideo = document.getElementById("video-call-remote") as
        | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        | null;

      // Prefer fullscreen on the container (desktop + modern Android Chrome).
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
        return;
      }

      // iOS Safari fallback: only video elements can truly enter fullscreen.
      if (remoteVideo?.webkitEnterFullscreen) {
        remoteVideo.webkitEnterFullscreen();
        return;
      }

      if (remoteVideo?.requestFullscreen) {
        await remoteVideo.requestFullscreen();
      }
    } catch (e) {
      // Ignore; browser may block fullscreen without direct user gesture in some cases.
    }
  }, []);

  useEffect(() => {
    if (!token || !sessionId) return;
    if (callEnded) return;
    const checkStatus = () => {
      fetch(`/api/video-call/${sessionId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.serverNow) {
            clockOffsetRef.current = new Date(d.serverNow).getTime() - Date.now();
          }
          if (d.status === "ended") {
            setCallEnded(true);
            if (roomRef.current) {
              roomRef.current.disconnect();
              roomRef.current = null;
            }
            setRoom(null);
            setLivekitToken(null);
            setLivekitUrl(null);
          } else if (d.status === "expired") {
            setCallExpired(true);
          } else if (d.status === "active") {
            setCallExpired(false);
            if (d.expiresAt && session) {
              setSession({ ...session, expiresAt: d.expiresAt });
            }
          }
        })
        .catch(() => {});
    };
    checkStatus();
    const ms = document.hidden ? 12000 : 5000;
    const id = setInterval(checkStatus, ms);
    return () => clearInterval(id);
  }, [token, sessionId, callEnded, session]);

  const endCall = useCallback(async () => {
    if (!sessionId || !token) return;
    setEnding(true);
    try {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setRoom(null);
      await fetch(`/api/video-call/${sessionId}/end`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshUser?.();
      router.replace("/dashboard");
    } finally {
      setEnding(false);
    }
  }, [sessionId, token, refreshUser, router]);

  const extendCall = async () => {
    if (!sessionId || !token || user?.role !== "client") return;
    setExtending(true);
    try {
      const res = await fetch(`/api/video-call/${sessionId}/extend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.expiresAt) {
        setSession((s) => (s ? { ...s, expiresAt: data.expiresAt } : null));
        setCallExpired(false);
        await refreshUser?.();
      } else if (data.code === "NEED_CREDITS") {
        setError("Not enough credits to extend. Get more from your account.");
      }
    } finally {
      setExtending(false);
    }
  };

  const quickTip = async () => {
    if (!sessionId || !token || tipping) return;
    setTipping(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: 1, context: "video_call", referenceId: sessionId }),
      });
      if (res.ok) {
        setTipFlash(true);
        refreshUser?.();
        setTimeout(() => setTipFlash(false), 1200);
      }
    } finally {
      setTipping(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "client") return;
    if (!callExpired || callEnded) {
      if (autoEndTimeoutRef.current) {
        clearTimeout(autoEndTimeoutRef.current);
        autoEndTimeoutRef.current = null;
      }
      return;
    }
    if (autoEndTimeoutRef.current) {
      clearTimeout(autoEndTimeoutRef.current);
    }
    autoEndTimeoutRef.current = setTimeout(() => {
      autoEndTimeoutRef.current = null;
      if (!callExpired || callEnded) return;
      void endCall();
    }, 30000);
    return () => {
      if (autoEndTimeoutRef.current) {
        clearTimeout(autoEndTimeoutRef.current);
        autoEndTimeoutRef.current = null;
      }
    };
  }, [callExpired, callEnded, user?.role, endCall]);

  if (!authReady || !token) return null;

  if (loading && !session && !callEnded) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-silver)]">Loading call…</p>
      </div>
    );
  }

  if (error && !session && !callEnded) {
    return (
      <div className="pt-24 min-h-screen max-w-lg mx-auto px-6">
        <p className="text-red-300 mb-4">{error}</p>
        <Link href="/dashboard" className="text-sm tracking-widest uppercase text-[var(--color-champagne)]">
          ← Dashboard
        </Link>
      </div>
    );
  }

  if (!session && callEnded) {
    return (
      <div className="pt-24 min-h-screen max-w-lg mx-auto px-6">
        <p className="text-[var(--color-ivory)] text-lg font-light mb-2">Call ended</p>
        <p className="text-[var(--color-silver)] text-sm mb-4">
          The 1-1 video call has ended. You can continue chatting in your connection.
        </p>
        <Link
          href="/dashboard"
          className="inline-block text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] px-4 py-2 hover:bg-[var(--color-champagne)]/10"
        >
          Back to connections
        </Link>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col w-full px-0 py-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <Link
              href="/dashboard"
              className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
            >
              ← Dashboard
            </Link>
            <span className="mt-1 text-sm text-[var(--color-silver)]">
              Video call with {session.other.name}
            </span>
          </div>
        </div>

        <div
          id="video-call-stage"
          className="flex-1 relative bg-black overflow-hidden flex items-center justify-center w-full h-[calc(100vh-10rem)]"
        >
          {!room && (
            <p className="text-[var(--color-silver)] text-sm">Connecting camera…</p>
          )}
          {room && !callEnded && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoCallRemote room={room} />
              </div>
              <div className="absolute bottom-4 right-4 w-40 sm:w-48 aspect-video rounded border-2 border-[var(--color-border)] overflow-hidden bg-[var(--color-charcoal)]">
                <VideoCallLocal room={room} />
              </div>
            </>
          )}
          {room && !callEnded && !mediaStarted && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center">
              <p className="text-[var(--color-ivory)] font-light mb-3">
                Tap to enable camera & microphone
              </p>
              <p className="text-sm text-[var(--color-silver)] mb-4 max-w-md">
                Mobile browsers require a user action to start the camera/mic. If you&apos;re using HTTP or an untrusted
                HTTPS certificate, permissions may fail even if you granted them in settings.
              </p>
              {error && <p className="text-red-300/90 text-xs mb-3">{error}</p>}
              <button
                type="button"
                onClick={() => void startMedia()}
                disabled={mediaStarting}
                className="px-5 py-2.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50 rounded-sm"
              >
                {mediaStarting ? "Starting…" : "Enable camera & mic"}
              </button>
            </div>
          )}
          {!callEnded && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-green-600/90 text-white text-xs font-medium rounded">
                {timeLeft}
              </span>
              <span className="text-white/90 text-sm">{session.other.name}</span>
            </div>
          )}
          {user?.role === "escort" && !callEnded && tipToasts.length > 0 && (
            <div className="absolute top-3 right-3 z-50 flex flex-col gap-2 max-w-[260px] pointer-events-none">
              {tipToasts.map((t) => (
                <div
                  key={t.id}
                  className="px-4 py-2 rounded bg-[var(--color-obsidian)]/95 border border-[var(--color-champagne)]/60 shadow-lg"
                >
                  <p className="text-xs font-medium text-[var(--color-champagne)]">
                    {t.clientName} tipped you
                  </p>
                  <p className="text-sm text-[var(--color-ivory)]">
                    {t.amount} credit{t.amount !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
          {user?.role === "client" && callExpired && !callEnded && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
              <p className="text-[var(--color-ivory)] font-light mb-3">
                Your video session ended.
              </p>
              <p className="text-sm text-[var(--color-silver)] mb-4">
                Extend the call to keep seeing {session.other.name}.
              </p>
              {error && <p className="text-red-300/90 text-xs mb-2">{error}</p>}
              <button
                type="button"
                onClick={extendCall}
                disabled={extending}
                className="px-5 py-2.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50 rounded-sm"
              >
                {extending ? "Extending…" : "Extend (+2 min, 1 credit)"}
              </button>
              <button
                type="button"
                onClick={endCall}
                disabled={ending}
                className="mt-3 px-4 py-2 text-xs tracking-widest uppercase border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50 rounded-sm"
              >
                {ending ? "Ending…" : "End call"}
              </button>
            </div>
          )}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center max-w-[90%] pointer-events-none">
            {reconnecting && (
              <div className="px-4 py-2 rounded bg-amber-900/80 backdrop-blur-sm border border-amber-400/40 animate-pulse">
                <p className="text-amber-200 text-sm text-center font-medium">Reconnecting…</p>
              </div>
            )}
            {otherLeft && !callEnded && (
              <div className="px-4 py-2 rounded bg-black/70 backdrop-blur-sm border border-[var(--color-champagne)]/40">
                <p className="text-[var(--color-ivory)] text-sm text-center">{session.other.name} has disconnected</p>
              </div>
            )}
            {!!error && !!room && !callEnded && mediaStarted && !(user?.role === "client" && callExpired) && (
              <div className="px-3 py-2 rounded bg-black/60 backdrop-blur-sm border border-amber-300/30">
                <p className="text-amber-200/90 text-sm text-center">{error}</p>
              </div>
            )}
          </div>
          {!callEnded && (
            <div className="call-controls pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-full bg-black/40 backdrop-blur-sm pointer-events-auto">
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
                  title={isFullscreen ? "Exit full screen" : "Full screen"}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:bg-[var(--color-charcoal)]/40 disabled:opacity-50"
                >
                  {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
                </button>
                {user?.role === "client" && (
                  <>
                    <button
                      type="button"
                      onClick={quickTip}
                      disabled={tipping}
                      aria-label="Send 1 credit tip"
                      title="Send 1 credit tip"
                      className={`w-11 h-11 inline-flex items-center justify-center rounded-full border transition ${
                        tipFlash
                          ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/30 text-[var(--color-champagne)] scale-110"
                          : "border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10"
                      } disabled:opacity-50`}
                    >
                      <span className="sr-only">Tip</span>
                      <IconTipCoin />
                    </button>
                    <button
                      type="button"
                      onClick={extendCall}
                      disabled={extending}
                      aria-label="Extend call"
                      title="Extend call"
                      className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
                    >
                      <span className="sr-only">{extending ? "Extending" : "Extend"}</span>
                      <IconExtend />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={endCall}
                  disabled={ending}
                  aria-label="End call"
                  title="End call"
                  className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <span className="sr-only">{ending ? "Ending" : "End call"}</span>
                  <IconEndCall />
                </button>
              </div>
            </div>
          )}
        </div>

        {error && !room && (
          <p className="mt-2 text-sm text-amber-200/90">{error}</p>
        )}

        <div className="hidden mt-4 border-t border-[var(--color-border)] pt-3">
          <details className="text-xs text-[var(--color-muted)]">
            <summary className="cursor-pointer select-none text-[var(--color-silver)]">
              Something feels off? Report this video call.
            </summary>
            <form
              onSubmit={async (e) => {
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
                      reportType: "video_call",
                      referenceId: sessionId,
                      reason: reportReason.trim(),
                    }),
                  });
                  if (res.ok) {
                    setReportMessage("Thanks, your report has been submitted.");
                    setReportReason("");
                  } else {
                    const data = await res.json().catch(() => ({}));
                    setReportMessage(data.error || "Could not submit report. Please try again.");
                  }
                } finally {
                  setReporting(false);
                }
              }}
              className="mt-2 space-y-2"
            >
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={2}
                className="w-full px-2 py-1 bg-[var(--color-charcoal)] border border-[var(--color-border)] rounded-sm text-[var(--color-ivory)] text-xs"
                placeholder="Optional: briefly describe what happened."
              />
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-3 py-1 text-[0.7rem] tracking-widest uppercase border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50 rounded-sm"
                >
                  {reporting ? "Sending…" : "Report call"}
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

function VideoCallRemote({ room }: { room: Room }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoEl || !room) return;
    const onTrackSubscribed = (track: RemoteTrack, _publication: RemoteTrackPublication, _participant: RemoteParticipant) => {
      if (!videoEl) return;
      if (track.kind === "video") {
        if (typeof track.attach === "function") {
          track.attach(videoEl);
        } else {
          const stream = videoEl.srcObject instanceof MediaStream ? videoEl.srcObject : new MediaStream();
          if (!videoEl.srcObject) videoEl.srcObject = stream;
          if (!stream.getTracks().includes(track.mediaStreamTrack)) stream.addTrack(track.mediaStreamTrack);
        }
      } else if (track.kind === "audio") {
        const stream = videoEl.srcObject instanceof MediaStream ? videoEl.srcObject : new MediaStream();
        if (!videoEl.srcObject) videoEl.srcObject = stream;
        if (!stream.getTracks().includes(track.mediaStreamTrack)) stream.addTrack(track.mediaStreamTrack);
      }
    };
    const attachExisting = () => {
      try {
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.videoTrackPublications.values()) {
            const track = (pub as { track?: { kind: string; mediaStreamTrack: MediaStreamTrack; attach?: (el: HTMLVideoElement) => HTMLVideoElement } }).track;
            if (track?.mediaStreamTrack && videoEl) {
              if (typeof track.attach === "function") {
                track.attach(videoEl);
              } else {
                videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);
              }
              for (const apub of p.audioTrackPublications.values()) {
                const at = (apub as { track?: { mediaStreamTrack: MediaStreamTrack } }).track;
                if (at?.mediaStreamTrack && videoEl.srcObject instanceof MediaStream) {
                  (videoEl.srcObject as MediaStream).addTrack(at.mediaStreamTrack);
                }
              }
              return;
            }
          }
        }
      } catch {
        // ignore
      }
    };
    const onDisconnected = () => {
      if (videoEl) videoEl.srcObject = null;
    };
    room.on("trackSubscribed", onTrackSubscribed);
    room.on("participantConnected", attachExisting);
    room.on("participantDisconnected", onDisconnected);
    room.on("connected", attachExisting);
    attachExisting();
    const t1 = setTimeout(attachExisting, 500);
    const t2 = setTimeout(attachExisting, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      room.off("trackSubscribed", onTrackSubscribed);
      room.off("participantConnected", attachExisting);
      room.off("participantDisconnected", onDisconnected);
      room.off("connected", attachExisting);
      videoEl.srcObject = null;
    };
  }, [room, videoEl]);

  return (
    <video
      id="video-call-remote"
      ref={setVideoEl}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}

function VideoCallLocal({ room }: { room: Room }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoEl || !room) return;
    const attachLocalVideo = () => {
      const vidPubs = Array.from(room.localParticipant.videoTrackPublications.values());
      const vidPub = vidPubs[0] as { track?: { attach?: (el: HTMLVideoElement) => HTMLVideoElement; mediaStreamTrack?: MediaStreamTrack } } | undefined;
      const track = vidPub?.track;
      if (track) {
        if (typeof track.attach === "function") {
          track.attach(videoEl);
        } else if (track.mediaStreamTrack) {
          videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);
        }
      }
    };
    const onLocalTrackPublished = (publication: LocalTrackPublication, _participant: LocalParticipant) => {
      if (publication.kind === "video" && publication.track && videoEl) {
        const track = publication.track;
        if (typeof track.attach === "function") {
          track.attach(videoEl);
        } else if (track.mediaStreamTrack) {
          videoEl.srcObject = new MediaStream([track.mediaStreamTrack]);
        }
      }
    };
    attachLocalVideo();
    room.on("localTrackPublished", onLocalTrackPublished);
    const t1 = setTimeout(attachLocalVideo, 400);
    const t2 = setTimeout(attachLocalVideo, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      room.off("localTrackPublished", onLocalTrackPublished);
      videoEl.srcObject = null;
    };
  }, [room, videoEl]);

  return <video ref={setVideoEl} autoPlay muted playsInline className="w-full h-full object-cover" />;
}
