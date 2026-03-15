"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Room } from "livekit-client";

type LiveSession = { id: string; roomName: string; startedAt: string };
type VodItem = { id: string; createdAt: string; playbackUrl: string };

export default function GoLivePage() {
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

  const startLive = async () => {
    if (!token) return;
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
      const r = new Room();
      await r.connect(livekitUrl, livekitToken);

      if (liveSource === "vod" && selectedVodId) {
        const urlRes = await fetch(`/api/vods/${selectedVodId}/playback-url`, { headers: { Authorization: `Bearer ${token}` } });
        const urlData = await urlRes.json().catch(() => ({}));
        const playbackUrl = urlData.playbackUrl;
        if (!playbackUrl) throw new Error("Could not load video playback URL");
        const videoEl = document.createElement("video");
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.loop = true;
        videoEl.crossOrigin = "anonymous";
        vodVideoRef.current = videoEl;
        await new Promise<void>((resolve, reject) => {
          videoEl.oncanplay = () => resolve();
          videoEl.onerror = () => reject(new Error("Video failed to load"));
          videoEl.src = playbackUrl;
          videoEl.play().catch(reject);
        });
        const stream = videoEl.captureStream ? videoEl.captureStream(30) : (videoEl as HTMLVideoElement & { mozCaptureStream?: (fps?: number) => MediaStream }).mozCaptureStream?.(30);
        if (!stream) throw new Error("Browser does not support capturing video");
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoTrack) await r.localParticipant.publishTrack(videoTrack, { name: "camera" });
        if (audioTrack) await r.localParticipant.publishTrack(audioTrack, { name: "microphone" });
      } else {
        await r.localParticipant.enableCameraAndMicrophone();
      }

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
    };
  }, [room]);

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
            <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-4">Go live</h1>
            <p className="text-[var(--color-silver)] font-light mb-6">
              Start a live stream. Clients can watch and send messages in chat. You earn 1 credit per viewer who joins.
            </p>
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
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 bg-black rounded overflow-hidden aspect-video max-h-[500px] flex items-center justify-center relative">
                {room && <LivePreview room={room} />}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded">
                    LIVE
                  </span>
                  <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                    {viewerCount} watching
                  </span>
                </div>
              </div>
              <div className="w-full lg:w-80 flex flex-col border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded">
                <div className="p-3 border-b border-[var(--color-border)] text-sm text-[var(--color-silver)]">
                  Live chat
                </div>
                <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] p-3 space-y-2">
                  {chatMessages.length === 0 && <p className="text-[var(--color-muted)] text-sm">No messages yet.</p>}
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
                    placeholder="Type a message…"
                    className="flex-1 px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm focus:border-[var(--color-champagne)]/50"
                  />
                  <button type="submit" disabled={sendingChat} className="px-4 py-2 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50">
                    Send
                  </button>
                </form>
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
    const onLocalTrackPublished = (
      publication: { kind: string; track?: { attach: (el: HTMLVideoElement) => HTMLVideoElement; mediaStreamTrack?: MediaStreamTrack } },
      _participant: unknown
    ) => {
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
