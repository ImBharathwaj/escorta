"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant, DisconnectReason } from "livekit-client";
import { BlurredImage } from "@/components/BlurredImage";
import { IconEndCall, IconExitFullscreen, IconExtend, IconFullscreen, IconTipCoin } from "@/components/icons/CallIcons";

type LiveSessionSummary = {
  id: string;
  roomName: string;
  startedAt: string;
  escort: { id: string; aliasName: string; primaryPhotoId: string | null };
  viewerCount: number;
};

export default function LiveContent() {
  const router = useRouter();
  const { user, token, authReady, refreshUser } = useAuth();
  const [sessions, setSessions] = useState<LiveSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState("");
  const [currentSession, setCurrentSession] = useState<LiveSessionSummary | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; message: string; sender: { name: string }; createdAt: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [watchExpiresAt, setWatchExpiresAt] = useState<string | null>(null);
  const [watchExpired, setWatchExpired] = useState(false);
  const [extending, setExtending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [liveEnded, setLiveEnded] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [broadcasterLeft, setBroadcasterLeft] = useState(false);
  const [tipping, setTipping] = useState(false);
  const [tipFlash, setTipFlash] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const clockOffsetRef = useRef(0);

  useEffect(() => {
    if (!authReady) return;
    if (!token || user?.role !== "client") {
      router.push("/login");
      return;
    }
  }, [authReady, token, user?.role, router]);

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
      const container = document.getElementById("live-watch-stage");
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSessions = useCallback(() => {
    fetch("/api/live/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d.sessions) ? d.sessions : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, 10000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  const fetchChat = useCallback(() => {
    if (!currentSession?.id || !token) return;
    fetch(`/api/live/${currentSession.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setChatMessages(Array.isArray(d.messages) ? d.messages : []))
      .catch(() => {});
  }, [currentSession?.id, token]);

  useEffect(() => {
    if (!currentSession?.id) return;
    fetchChat();
    const id = setInterval(fetchChat, document.hidden ? 12000 : 5000);
    return () => clearInterval(id);
  }, [currentSession?.id, fetchChat]);

  const fetchViewerCount = useCallback(() => {
    if (!currentSession?.id) return;
    fetch(`/api/live/${currentSession.id}`)
      .then((r) => {
        if (r.status === 410) {
          setLiveEnded(true);
          return;
        }
        return r.json().then((d) => {
          if (d?.viewerCount !== undefined) setViewerCount(d.viewerCount);
        });
      })
      .catch(() => {});
  }, [currentSession?.id]);
  useEffect(() => {
    if (!currentSession?.id) return;
    fetchViewerCount();
    const id = setInterval(fetchViewerCount, document.hidden ? 12000 : 5000);
    return () => clearInterval(id);
  }, [currentSession?.id, fetchViewerCount]);

  // When companion ends live: disconnect and show "Live end" card
  useEffect(() => {
    if (!liveEnded) return;
    if (room) {
      room.disconnect();
      setRoom(null);
      setLivekitToken(null);
      setLivekitUrl(null);
    }
    if (currentSession?.id && token) {
      fetch(`/api/live/${currentSession.id}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }, [liveEnded, room, currentSession?.id, token]);

  const joinSession = async (sess: LiveSessionSummary) => {
    if (!token) return;
    setJoinError("");
    setJoiningId(sess.id);
    try {
      const res = await fetch(`/api/live/${sess.id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NEED_CREDITS") setJoinError("You need 1 credit to join. Get credits from your account.");
        else setJoinError(data.error || "Failed to join");
        return;
      }
      const livekitUrl = data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL;
      const livekitToken = data.token;
      if (!livekitUrl || !livekitToken) {
        setJoinError("Missing stream URL or token");
        return;
      }
      if (data.serverNow) {
        clockOffsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      }
      await refreshUser();
      const r = new Room({ adaptiveStream: true, dynacast: true });
      r.on(RoomEvent.Reconnecting, () => setReconnecting(true));
      r.on(RoomEvent.Reconnected, () => setReconnecting(false));
      r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        setReconnecting(false);
        if (reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED) {
          setLiveEnded(true);
        }
      });
      r.on(RoomEvent.ParticipantDisconnected, () => setBroadcasterLeft(true));
      await r.connect(livekitUrl, livekitToken);
      await r.startAudio();
      roomRef.current = r;
      setCurrentSession(sess);
      setLivekitToken(livekitToken);
      setLivekitUrl(livekitUrl);
      setRoom(r);
      setWatchExpiresAt(data.watchExpiresAt ?? null);
      setWatchExpired(false);
      setLiveEnded(false);
      setBroadcasterLeft(false);
    } catch (err) {
      console.error("LiveKit connect failed:", err);
      setJoinError(err instanceof Error ? err.message : "Failed to join stream");
    } finally {
      setJoiningId(null);
    }
  };

  const leaveSession = async () => {
    if (currentSession?.id && token) {
      await fetch(`/api/live/${currentSession.id}/leave`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    }
    if (room) {
      await room.disconnect();
    }
    setRoom(null);
    setCurrentSession(null);
    setLivekitToken(null);
    setLivekitUrl(null);
    setWatchExpiresAt(null);
    setWatchExpired(false);
    setSecondsLeft(null);
    setLiveEnded(false);
    setReportSent(false);
  };

  useEffect(() => {
    if (!token || !currentSession?.id || liveEnded) return;
    const handleUnload = () => {
      try {
        fetch(`/api/live/${currentSession.id}/leave`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        });
      } catch { /* best effort */ }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [token, currentSession?.id, liveEnded]);

  // Timer: disconnect when watch time expires (do not call leave so user can extend and re-join)
  useEffect(() => {
    if (!watchExpiresAt || !room) return;
    const expiresMs = new Date(watchExpiresAt).getTime();
    const tick = () => {
      const serverNow = Date.now() + clockOffsetRef.current;
      const left = Math.max(0, Math.ceil((expiresMs - serverNow) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        room.disconnect();
        setRoom(null);
        setLivekitToken(null);
        setLivekitUrl(null);
        setWatchExpired(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [watchExpiresAt, room]);

  const extendWatch = async () => {
    if (!currentSession?.id || !token) return;
    setExtending(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/live/${currentSession.id}/extend`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "NEED_CREDITS") setJoinError("You need 1 credit to add 2 more minutes.");
        else setJoinError(data.error || "Failed to extend");
        return;
      }
      if (data.serverNow) {
        clockOffsetRef.current = new Date(data.serverNow).getTime() - Date.now();
      }
      setWatchExpiresAt(data.watchExpiresAt ?? null);
      setWatchExpired(false);
      await refreshUser();
      if (!room) {
        const joinRes = await fetch(`/api/live/${currentSession.id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const joinData = await joinRes.json().catch(() => ({}));
        if (joinRes.ok && joinData.token && joinData.url) {
          const r = new Room({ adaptiveStream: true, dynacast: true });
          r.on(RoomEvent.Reconnecting, () => setReconnecting(true));
          r.on(RoomEvent.Reconnected, () => setReconnecting(false));
          r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
            setReconnecting(false);
            if (reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED) {
              setLiveEnded(true);
            }
          });
          r.on(RoomEvent.ParticipantDisconnected, () => setBroadcasterLeft(true));
          await r.connect(joinData.url || process.env.NEXT_PUBLIC_LIVEKIT_URL, joinData.token);
          await r.startAudio();
          roomRef.current = r;
          setRoom(r);
          setLivekitToken(joinData.token);
          setLivekitUrl(joinData.url);
          setBroadcasterLeft(false);
        }
      }
    } finally {
      setExtending(false);
    }
  };

  useEffect(() => {
    const r = room;
    return () => {
      if (r) r.disconnect();
      roomRef.current = null;
    };
  }, [room]);

  const reportSession = async () => {
    if (!currentSession?.id || !token || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      const res = await fetch(`/api/live/${currentSession.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reportReason.trim() || undefined }),
      });
      if (res.ok) {
        setReportSent(true);
        setShowReportModal(false);
        setReportReason("");
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || !currentSession?.id || !token || sendingChat) return;
    setSendingChat(true);
    try {
      const res = await fetch(`/api/live/${currentSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });
      if (res.ok) {
        setChatInput("");
        fetchChat();
      }
    } finally {
      setSendingChat(false);
    }
  };

  const quickTip = async () => {
    if (!currentSession?.id || !token || tipping) return;
    setTipping(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: 1, context: "live_session", referenceId: currentSession.id }),
      });
      if (res.ok) {
        setTipFlash(true);
        refreshUser();
        setTimeout(() => setTipFlash(false), 1200);
      }
    } finally {
      setTipping(false);
    }
  };

  if (!authReady || (token && user?.role !== "client")) return null;

    if (currentSession && (livekitToken || watchExpired || liveEnded)) {
    const minsLeft = secondsLeft != null ? Math.floor(secondsLeft / 60) : null;
    const secsRem = secondsLeft != null ? secondsLeft % 60 : null;
    const showExtendPrompt = secondsLeft != null && secondsLeft <= 60 && secondsLeft > 0;
    return (
      <div className="pt-24 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div
            id="live-watch-stage"
            className="bg-black rounded overflow-hidden aspect-video max-h-[70vh] flex items-center justify-center relative"
          >
            {room && !liveEnded && <WatchStream room={room} />}
            {liveEnded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-obsidian)]/95 p-6 text-center z-30">
                <p className="text-xl font-light text-[var(--color-ivory)] mb-2">Live ended</p>
                <p className="text-sm text-[var(--color-silver)] mb-6">
                  {currentSession.escort.aliasName} has ended the stream.
                </p>
                <button
                  type="button"
                  onClick={leaveSession}
                  className="px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 transition"
                >
                  Back to live
                </button>
              </div>
            )}
            {!liveEnded && watchExpired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-30">
                <p className="text-[var(--color-ivory)] font-light mb-4">Your watch time ended.</p>
                <p className="text-sm text-[var(--color-silver)] mb-4">Add 2 more minutes (1 credit) to keep watching.</p>
                {joinError && <p className="text-red-300 text-sm mb-2">{joinError}</p>}
                <button
                  type="button"
                  onClick={extendWatch}
                  disabled={extending}
                  className="px-5 py-2.5 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
                >
                  {extending ? "…" : "Add 2 more minutes (1 credit)"}
                </button>
                <button type="button" onClick={leaveSession} className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-silver)]">
                  Leave stream
                </button>
              </div>
            )}
            {!liveEnded && !watchExpired && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded">
                    LIVE — {currentSession.escort.aliasName}
                  </span>
                  <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                    {viewerCount} watching
                  </span>
                  {secondsLeft != null && secondsLeft > 0 && (
                    <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                      {minsLeft != null && secsRem != null ? `${minsLeft}:${String(secsRem).padStart(2, "0")} left` : ""}
                    </span>
                  )}
                </div>
                {showExtendPrompt && (
                  <div className="absolute bottom-20 left-3 right-3 z-30 flex items-center justify-center gap-3">
                    <span className="text-white/90 text-sm">Less than 1 min left</span>
                    <button
                      type="button"
                      onClick={extendWatch}
                      disabled={extending}
                      className="px-4 py-2 text-sm bg-[var(--color-champagne)]/90 text-[var(--color-obsidian)] rounded hover:bg-[var(--color-champagne)] disabled:opacity-50"
                    >
                      {extending ? "…" : "Add 2 min (1 credit)"}
                    </button>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  {!reportSent ? (
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="px-4 py-2 text-sm bg-black/60 text-white rounded hover:bg-black/80"
                    >
                      Report
                    </button>
                  ) : (
                    <span className="px-3 py-2 text-xs text-white/80">Report submitted</span>
                  )}
                </div>
              </>
            )}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center max-w-[90%] pointer-events-none">
              {reconnecting && (
                <div className="px-4 py-2 rounded bg-amber-900/80 backdrop-blur-sm border border-amber-400/40 animate-pulse">
                  <p className="text-amber-200 text-sm text-center font-medium">Reconnecting…</p>
                </div>
              )}
              {broadcasterLeft && !liveEnded && (
                <div className="px-4 py-2 rounded bg-black/70 backdrop-blur-sm border border-[var(--color-champagne)]/40">
                  <p className="text-[var(--color-ivory)] text-sm text-center">{currentSession.escort.aliasName} has disconnected</p>
                </div>
              )}
            </div>
            {/* Transparent chat overlay on video */}
            {!liveEnded && !watchExpired && (
              <div className="absolute left-0 bottom-16 z-15 w-full sm:w-[60%] max-h-[45%] pointer-events-none">
                <div className="overflow-y-auto max-h-[160px] px-3 py-1 flex flex-col-reverse">
                  <div className="space-y-2">
                    {chatMessages.slice(-20).map((m) => (
                      <p key={m.id} className="text-sm leading-snug">
                        <span className="font-medium text-[var(--color-champagne)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{m.sender.name}</span>
                        <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"> {m.message}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <form onSubmit={sendChat} className="flex items-center justify-center gap-2 px-3 pt-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={quickTip}
                    disabled={tipping || !!liveEnded}
                    title="Send 1 credit tip"
                    className={`shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-full border text-sm font-medium transition ${
                      tipFlash
                        ? "border-[var(--color-champagne)] bg-[var(--color-champagne)]/30 text-[var(--color-champagne)] scale-110"
                        : "border-[var(--color-champagne)]/60 bg-black/50 backdrop-blur-sm text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/20"
                    } disabled:opacity-50`}
                  >
                    <IconTipCoin />
                  </button>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something…"
                    disabled={liveEnded || watchExpired}
                    className="flex-1 min-w-0 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/20 text-white text-sm rounded-full placeholder:text-white/40 focus:border-[var(--color-champagne)]/50 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || liveEnded || watchExpired}
                    className="shrink-0 px-4 py-1.5 text-sm bg-[var(--color-champagne)]/80 text-[var(--color-obsidian)] rounded-full hover:bg-[var(--color-champagne)] disabled:opacity-50 font-medium"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
            {!liveEnded && !watchExpired && (
              <div className="call-controls pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center">
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
                  {showExtendPrompt && (
                    <button
                      type="button"
                      onClick={extendWatch}
                      disabled={extending}
                      aria-label="Extend watch time"
                      title="Extend watch time"
                      className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
                    >
                      <span className="sr-only">{extending ? "Extending" : "Extend"}</span>
                      <IconExtend />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={leaveSession}
                    aria-label="Leave stream"
                    title="Leave stream"
                    className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <span className="sr-only">Leave</span>
                    <IconEndCall />
                  </button>
                </div>
              </div>
            )}
          </div>
          {showReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !reportSubmitting && setShowReportModal(false)}>
              <div className="bg-[var(--color-charcoal)] border border-[var(--color-border)] rounded p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-light text-[var(--color-ivory)] mb-2">Report this stream</h3>
                <p className="text-sm text-[var(--color-silver)] mb-4">Your report will be reviewed. Optional reason:</p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason (optional)"
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded mb-4 resize-none"
                />
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => !reportSubmitting && setShowReportModal(false)} className="px-4 py-2 text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)]" disabled={reportSubmitting}>Cancel</button>
                  <button type="button" onClick={reportSession} disabled={reportSubmitting} className="px-4 py-2 text-sm bg-red-600/80 text-white rounded hover:bg-red-600 disabled:opacity-50">{reportSubmitting ? "…" : "Submit report"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/dashboard" className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
          ← Dashboard
        </Link>
        <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-6">Live now</h1>
        {joinError && <p className="text-red-300 text-sm mb-4">{joinError}</p>}
        {loading ? (
          <p className="text-[var(--color-silver)]">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-[var(--color-silver)]">No one is live right now. Check back later.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded overflow-hidden"
              >
                <div className="aspect-video bg-[var(--color-obsidian)] relative">
                  {s.escort.primaryPhotoId ? (
                    <BlurredImage
                      photoId={s.escort.primaryPhotoId}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-muted)]">
                      No photo
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded">LIVE</span>
                  </div>
                  <div className="absolute bottom-2 left-2 text-white text-sm">
                    {s.viewerCount} watching
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[var(--color-ivory)] font-light">{s.escort.aliasName}</p>
                  <button
                    type="button"
                    onClick={() => joinSession(s)}
                    disabled={!!joiningId}
                    className="mt-3 w-full py-2 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
                  >
                    {joiningId === s.id ? "Joining…" : "Watch (1 credit)"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WatchStream({ room }: { room: Room }) {
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

  return <video ref={setVideoEl} autoPlay playsInline className="w-full h-full object-cover" />;
}
