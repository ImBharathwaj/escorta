"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Room, RoomEvent, LocalTrackPublication, LocalParticipant, DisconnectReason } from "livekit-client";
import { IconExitFullscreen, IconFullscreen, IconEndCall } from "@/components/icons/CallIcons";

type LiveSession = { id: string; roomName: string; startedAt: string };
type VodItem = { id: string; createdAt: string; playbackUrl: string };

export default function GoLiveContent() {
  const router = useRouter();
  const { user, token, authReady } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; message: string; sender: { name: string }; createdAt: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [ending, setEnding] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [vods, setVods] = useState<VodItem[]>([]);
  const [liveSource, setLiveSource] = useState<"camera" | "vod">("camera");
  const [selectedVodId, setSelectedVodId] = useState<string | null>(null);
  const [vodUploading, setVodUploading] = useState(false);
  const vodVideoRef = useRef<HTMLVideoElement | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  type TipToast = { id: string; clientName: string; amount: number; createdAt: string };
  const [tipToasts, setTipToasts] = useState<TipToast[]>([]);
  const seenTipIdsRef = useRef<Set<string>>(new Set());
  const tipRemoveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const roomRef = useRef<Room | null>(null);

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
      const container = document.getElementById("live-stage");
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!token || user?.role !== "escort") {
      router.push("/login");
      return;
    }
  }, [authReady, token, user?.role, router]);

  useEffect(() => {
    if (!token || user?.role !== "escort") return;
    fetch("/api/escorts/me/vods", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setIsPremium(!!d?.isPremium);
        setVods(Array.isArray(d?.vods) ? d.vods : []);
      })
      .catch(() => {});
  }, [token, user?.role]);

  const fetchChat = useCallback(() => {
    if (!session?.id || !token) return;
    fetch(`/api/live/${session.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setChatMessages(Array.isArray(d.messages) ? d.messages : []))
      .catch(() => {});
  }, [session?.id, token]);

  useEffect(() => {
    if (!session?.id) return;
    fetchChat();
    const id = setInterval(fetchChat, 5000);
    return () => clearInterval(id);
  }, [session?.id, fetchChat]);

  const fetchViewerCount = useCallback(() => {
    if (!session?.id) return;
    fetch(`/api/live/${session.id}`)
      .then((r) => r.json())
      .then((d) => setViewerCount(d.viewerCount ?? 0))
      .catch(() => {});
  }, [session?.id]);
  useEffect(() => {
    if (!session?.id) return;
    fetchViewerCount();
    const id = setInterval(fetchViewerCount, 4000);
    return () => clearInterval(id);
  }, [session?.id, fetchViewerCount]);

  const hasFetchedTipsOnceRef = useRef(false);
  const fetchLiveTips = useCallback(() => {
    if (!session?.id || !token) return;
    fetch(`/api/live/${session.id}/tips`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const tips = Array.isArray(d.tips) ? d.tips : [];
        const seen = seenTipIdsRef.current;
        const isFirstFetch = !hasFetchedTipsOnceRef.current;
        if (isFirstFetch) {
          hasFetchedTipsOnceRef.current = true;
          tips.forEach((t: TipToast) => seen.add(t.id));
          return;
        }
        const newTips = tips.filter((t: TipToast) => !seen.has(t.id));
        if (newTips.length === 0) return;
        newTips.forEach((t: TipToast) => seen.add(t.id));
        const TIP_TOAST_DURATION_MS = 5000;
        setTipToasts((prev) => [...prev, ...newTips]);
        newTips.forEach((t: TipToast) => {
          const tid = setTimeout(() => {
            setTipToasts((p) => p.filter((x) => x.id !== t.id));
          }, TIP_TOAST_DURATION_MS);
          if (tipRemoveTimeoutsRef.current[t.id] != null) clearTimeout(tipRemoveTimeoutsRef.current[t.id]);
          tipRemoveTimeoutsRef.current[t.id] = tid;
        });
      })
      .catch(() => {});
  }, [session?.id, token]);
  useEffect(() => {
    if (!session?.id) return;
    seenTipIdsRef.current = new Set();
    hasFetchedTipsOnceRef.current = false;
    fetchLiveTips();
    const id = setInterval(fetchLiveTips, 4000);
    return () => {
      clearInterval(id);
      Object.values(tipRemoveTimeoutsRef.current).forEach(clearTimeout);
      tipRemoveTimeoutsRef.current = {};
    };
  }, [session?.id, fetchLiveTips]);

  const startLive = async () => {
    if (!token) return;
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("Camera/mic require HTTPS (secure context). Open the site over trusted HTTPS on mobile.");
      return;
    }
    if (liveSource === "vod" && !selectedVodId) {
      setError("Select an uploaded video first");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/live/start", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to start");
      const livekitUrl = data.url || process.env.NEXT_PUBLIC_LIVEKIT_URL;
      const livekitToken = data.token;
      if (!livekitUrl || !livekitToken) throw new Error("Missing LiveKit URL or token");
      const r = new Room({ adaptiveStream: true, dynacast: true });
      r.on(RoomEvent.Reconnecting, () => setReconnecting(true));
      r.on(RoomEvent.Reconnected, () => setReconnecting(false));
      r.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        setReconnecting(false);
        if (reason === DisconnectReason.PARTICIPANT_REMOVED || reason === DisconnectReason.ROOM_DELETED) {
          setError("Disconnected from stream server.");
        }
      });
      await r.connect(livekitUrl, livekitToken);

      if (liveSource === "vod" && selectedVodId) {
        const playbackUrl = `/api/vods/${selectedVodId}/stream?token=${encodeURIComponent(token)}`;
        const videoEl = document.createElement("video");
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.loop = true;
        vodVideoRef.current = videoEl;
        await new Promise<void>((resolve, reject) => {
          videoEl.oncanplay = () => {
            videoEl.play().then(() => resolve()).catch(reject);
          };
          videoEl.onerror = () =>
            reject(new Error("Video failed to load. Check the file format (mp4/webm)."));
          videoEl.src = playbackUrl;
          videoEl.load();
        });
        const vid = videoEl as HTMLVideoElement & { captureStream?(fps?: number): MediaStream; mozCaptureStream?(fps?: number): MediaStream };
        const stream = vid.captureStream?.(30) ?? vid.mozCaptureStream?.(30);
        if (!stream) throw new Error("Browser does not support capturing video");
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoTrack) await r.localParticipant.publishTrack(videoTrack, { name: "camera" });
        if (audioTrack) await r.localParticipant.publishTrack(audioTrack, { name: "microphone" });
      } else {
        await r.localParticipant.enableCameraAndMicrophone();
      }

      roomRef.current = r;
      setSession(data.session);
      setLivekitToken(livekitToken);
      setLivekitUrl(livekitUrl);
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
      if (vodVideoRef.current) {
        vodVideoRef.current.pause();
        vodVideoRef.current.src = "";
        vodVideoRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const endLive = async () => {
    if (!session?.id || !token || !room) return;
    setEnding(true);
    try {
      if (vodVideoRef.current) {
        vodVideoRef.current.pause();
        vodVideoRef.current.src = "";
        vodVideoRef.current = null;
      }
      await room.disconnect();
      setRoom(null);
      await fetch(`/api/live/${session.id}/end`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      setSession(null);
      setLivekitToken(null);
      setLivekitUrl(null);
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    const r = room;
    return () => {
      if (r) r.disconnect();
      roomRef.current = null;
    };
  }, [room]);

  useEffect(() => {
    if (!token || !session?.id) return;
    const handleUnload = () => {
      try {
        fetch(`/api/live/${session.id}/end`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        });
      } catch { /* best effort */ }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [token, session?.id]);

  const deleteMessage = async (messageId: string) => {
    if (!session?.id || !token || deletingMessageId) return;
    setDeletingMessageId(messageId);
    try {
      const res = await fetch(`/api/live/${session.id}/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchChat();
    } finally {
      setDeletingMessageId(null);
    }
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg || !session?.id || !token || sendingChat) return;
    setSendingChat(true);
    try {
      const res = await fetch(`/api/live/${session.id}/messages`, {
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

  if (!authReady || (token && user?.role !== "escort")) return null;

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/dashboard" className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
          ← Dashboard
        </Link>

        {!session ? (
          <div>
            <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-6">Go live</h1>
            {error && <p className="text-red-300 text-sm mb-4">{error}</p>}
            {isPremium && (
              <div className="mb-6 space-y-3">
                <p className="text-sm text-[var(--color-silver)]">Source (premium)</p>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="liveSource"
                      checked={liveSource === "camera"}
                      onChange={() => { setLiveSource("camera"); setSelectedVodId(null); }}
                      className="text-[var(--color-champagne)]"
                    />
                    <span className="text-[var(--color-ivory)]">Camera (real live)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="liveSource"
                      checked={liveSource === "vod"}
                      onChange={() => setLiveSource("vod")}
                      className="text-[var(--color-champagne)]"
                    />
                    <span className="text-[var(--color-ivory)]">Uploaded video (shown as live)</span>
                  </label>
                </div>
                {liveSource === "vod" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[var(--color-silver)]">Upload a video (max 50MB, mp4/webm). It will loop as your live stream.</p>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      className="block text-sm text-[var(--color-silver)] file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-[var(--color-border)] file:text-[var(--color-ivory)]"
                      disabled={vodUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !token) return;
                        e.target.value = "";
                        setVodUploading(true);
                        try {
                          const form = new FormData();
                          form.append("file", file);
                          const r = await fetch("/api/escorts/me/vods", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token}` },
                            body: form,
                          });
                          const d = await r.json().catch(() => ({}));
                          if (r.ok && d.id) setVods((prev) => [{ id: d.id, createdAt: d.createdAt, playbackUrl: d.playbackUrl ?? "" }, ...prev]);
                          else setError(d.error || "Upload failed");
                        } finally {
                          setVodUploading(false);
                        }
                      }}
                    />
                    {vods.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-[var(--color-silver)] mb-1">Use this video:</p>
                        <select
                          value={selectedVodId ?? ""}
                          onChange={(e) => setSelectedVodId(e.target.value || null)}
                          className="w-full max-w-md px-3 py-2 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded"
                        >
                          <option value="">Select…</option>
                          {vods.map((v) => (
                            <option key={v.id} value={v.id}>
                              Video {v.id.slice(0, 8)}…
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!isPremium && (
              <p className="text-xs text-[var(--color-muted)] mb-4">
                Premium companions can upload a video to use as live. Request premium from your{" "}
                <Link href="/dashboard" className="text-[var(--color-champagne)] hover:underline">dashboard</Link>.
              </p>
            )}
            <button
              type="button"
              onClick={startLive}
              disabled={loading || (liveSource === "vod" && !selectedVodId)}
              className="px-8 py-4 text-sm tracking-widest uppercase border border-red-500/80 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition disabled:opacity-50"
            >
              {loading ? "Starting…" : "Start live"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-light text-[var(--color-ivory)]">You&apos;re live</h1>
            <div
              id="live-stage"
              className="bg-black rounded overflow-hidden aspect-video max-h-[70vh] flex items-center justify-center relative"
            >
              {room && <LivePreview room={room} />}
              {reconnecting && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded bg-amber-900/80 backdrop-blur-sm border border-amber-400/40 animate-pulse pointer-events-none">
                  <p className="text-amber-200 text-sm text-center font-medium">Reconnecting…</p>
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded">
                  LIVE
                </span>
                <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                  {viewerCount} watching
                </span>
              </div>
              <div className="absolute top-3 right-3 flex flex-col gap-2 max-w-[280px] pointer-events-none z-10">
                {tipToasts.map((t) => (
                  <div
                    key={t.id}
                    className="animate-live-tip-in px-4 py-3 rounded-lg border border-[var(--color-champagne)]/60 bg-[var(--color-obsidian)]/95 shadow-lg backdrop-blur-sm"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm font-medium text-[var(--color-champagne)]">
                      {t.clientName} tipped you
                    </p>
                    <p className="text-lg font-semibold text-[var(--color-ivory)] mt-0.5">
                      {t.amount} credit{t.amount !== 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>

              {/* Transparent chat overlay on video */}
              <div className="absolute left-0 bottom-16 z-15 w-full sm:w-[60%] max-h-[45%] pointer-events-none">
                <div className="overflow-y-auto max-h-[160px] px-3 py-1 flex flex-col-reverse">
                  <div className="space-y-2">
                    {chatMessages.length === 0 && (
                      <p className="text-white/40 text-sm">No messages yet</p>
                    )}
                    {chatMessages.slice(-20).map((m) => (
                      <div key={m.id} className="flex items-center gap-1 group">
                        <p className="text-sm leading-snug flex-1 min-w-0">
                          <span className="font-medium text-[var(--color-champagne)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{m.sender.name}</span>
                          <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"> {m.message}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteMessage(m.id)}
                          disabled={deletingMessageId === m.id}
                          className="pointer-events-auto flex-shrink-0 text-white/40 hover:text-red-400 text-xs px-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                          title="Delete message"
                        >
                          {deletingMessageId === m.id ? "…" : "×"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={sendChat} className="flex items-center justify-center gap-2 px-3 pt-2 pointer-events-auto">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something…"
                    className="flex-1 min-w-0 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/20 text-white text-sm rounded-full placeholder:text-white/40 focus:border-[var(--color-champagne)]/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat}
                    className="shrink-0 px-4 py-1.5 text-sm bg-[var(--color-champagne)]/80 text-[var(--color-obsidian)] rounded-full hover:bg-[var(--color-champagne)] disabled:opacity-50 font-medium"
                  >
                    Send
                  </button>
                </form>
              </div>

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
                  <button
                    type="button"
                    onClick={endLive}
                    disabled={ending}
                    aria-label="End live"
                    title="End live"
                    className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <span className="sr-only">{ending ? "Ending" : "End live"}</span>
                    <IconEndCall />
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={endLive}
              disabled={ending}
              className="px-6 py-3 text-sm tracking-widest uppercase border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              {ending ? "Ending…" : "End live"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LivePreview({ room }: { room: Room }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoEl || !room) return;
    const attachLocalVideo = () => {
      const vidPubs = Array.from(room.localParticipant.videoTrackPublications.values());
      const vidPub = vidPubs[0] as { track?: { attach: (el: HTMLVideoElement) => HTMLVideoElement; mediaStreamTrack?: MediaStreamTrack } } | undefined;
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
