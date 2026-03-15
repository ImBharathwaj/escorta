"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Room } from "livekit-client";
import { BlurredImage } from "@/components/BlurredImage";

type LiveSessionSummary = {
  id: string;
  roomName: string;
  startedAt: string;
  escort: { id: string; aliasName: string; primaryPhotoId: string | null };
  viewerCount: number;
};

export default function LivePage() {
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

  useEffect(() => {
    if (!authReady) return;
    if (!token || user?.role !== "client") {
      router.push("/login");
      return;
    }
  }, [authReady, token, user?.role, router]);

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
    const id = setInterval(fetchChat, 4000);
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
    const id = setInterval(fetchViewerCount, 4000);
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
      await refreshUser();
      const r = new Room();
      await r.connect(livekitUrl, livekitToken);
      await r.startAudio();
      setCurrentSession(sess);
      setLivekitToken(livekitToken);
      setLivekitUrl(livekitUrl);
      setRoom(r);
      setWatchExpiresAt(data.watchExpiresAt ?? null);
      setWatchExpired(false);
      setLiveEnded(false);
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
  };

  // Timer: disconnect when watch time expires (do not call leave so user can extend and re-join)
  useEffect(() => {
    if (!watchExpiresAt || !room) return;
    const expiresMs = new Date(watchExpiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
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
      setWatchExpiresAt(data.watchExpiresAt ?? null);
      setWatchExpired(false);
      await refreshUser();
      if (!room) {
        const joinRes = await fetch(`/api/live/${currentSession.id}/join`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const joinData = await joinRes.json().catch(() => ({}));
        if (joinRes.ok && joinData.token && joinData.url) {
          const r = new Room();
          await r.connect(joinData.url || process.env.NEXT_PUBLIC_LIVEKIT_URL, joinData.token);
          await r.startAudio();
          setRoom(r);
          setLivekitToken(joinData.token);
          setLivekitUrl(joinData.url);
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
    };
  }, [room]);

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

  if (!authReady || (token && user?.role !== "client")) return null;

  if (currentSession && (livekitToken || watchExpired || liveEnded)) {
    const minsLeft = secondsLeft != null ? Math.floor(secondsLeft / 60) : null;
    const secsRem = secondsLeft != null ? secondsLeft % 60 : null;
    const showExtendPrompt = secondsLeft != null && secondsLeft <= 60 && secondsLeft > 0;
    return (
      <div className="pt-24 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-black rounded overflow-hidden aspect-video max-h-[500px] flex items-center justify-center relative">
              {room && !liveEnded && <WatchStream room={room} />}
              {liveEnded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-obsidian)]/95 p-6 text-center">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
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
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded">
                      LIVE — {currentSession.escort.aliasName}
                    </span>
                    <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                      {viewerCount} watching
                    </span>
                  </div>
                  {secondsLeft != null && secondsLeft > 0 && (
                    <div className="absolute top-3 left-32 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                      {minsLeft != null && secsRem != null ? `${minsLeft}:${String(secsRem).padStart(2, "0")} left` : ""}
                    </div>
                  )}
                  {showExtendPrompt && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-3">
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
                  <button
                    type="button"
                    onClick={leaveSession}
                    className="absolute top-3 right-3 px-4 py-2 text-sm bg-black/60 text-white rounded hover:bg-black/80"
                  >
                    Leave
                  </button>
                </>
              )}
            </div>
            <div className="w-full lg:w-80 flex flex-col border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded">
              <div className="p-3 border-b border-[var(--color-border)] text-sm text-[var(--color-silver)]">
                Live chat
              </div>
              <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] p-3 space-y-2">
                {chatMessages.map((m) => (
                  <p key={m.id} className="text-sm">
                    <span className="text-[var(--color-champagne)]">{m.sender.name}:</span>{" "}
                    <span className="text-[var(--color-ivory)]">{m.message}</span>
                  </p>
                ))}
              </div>
              <form onSubmit={sendChat} className="p-3 border-t border-[var(--color-border)] flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={liveEnded ? "Stream ended" : "Type a message…"}
                  disabled={liveEnded}
                  className="flex-1 px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm focus:border-[var(--color-champagne)]/50 disabled:opacity-50"
                />
                <button type="submit" disabled={sendingChat || liveEnded} className="px-4 py-2 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          </div>
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
        <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-2">Live now</h1>
        <p className="text-[var(--color-silver)] font-light mb-6">
          Companions streaming now. Join to watch and chat. 1 credit per join.
        </p>
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
    const onTrackSubscribed = (
      track: { kind: string; mediaStreamTrack: MediaStreamTrack; attach?: (el: HTMLVideoElement) => HTMLVideoElement },
      _publication: unknown,
      _participant: unknown
    ) => {
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
