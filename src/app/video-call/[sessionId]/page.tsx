"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Room } from "livekit-client";

type SessionInfo = {
  id: string;
  roomName: string;
  expiresAt: string;
  startedAt: string;
  other: { id: string; name: string };
};

function formatTimeLeft(expiresAt: string): string {
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((end - now) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCallPage() {
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
    if (!session?.expiresAt) return;
    const update = () => setTimeLeft(formatTimeLeft(session.expiresAt));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session?.expiresAt]);

  useEffect(() => {
    if (!livekitToken || !livekitUrl || !session) return;
    const r = new Room();
    roomRef.current = r;
    r.connect(livekitUrl, livekitToken)
      .then(() => r.localParticipant.enableCameraAndMicrophone())
      .then(() => {
        setRoom(r);
        r.startAudio?.();
      })
      .catch((err) => {
        setError(err?.message || "Failed to connect");
        setRoom(null);
        roomRef.current = null;
      });
    return () => {
      r.disconnect();
      roomRef.current = null;
    };
  }, [livekitToken, livekitUrl, session?.id]);

  const endCall = async () => {
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
  };

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
        await refreshUser?.();
      } else if (data.code === "NEED_CREDITS") {
        setError("Not enough credits to extend. Get more from your account.");
      }
    } finally {
      setExtending(false);
    }
  };

  if (!authReady || !token) return null;

  if (loading && !session) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-silver)]">Loading call…</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="pt-24 min-h-screen max-w-lg mx-auto px-6">
        <p className="text-red-300 mb-4">{error}</p>
        <Link href="/dashboard" className="text-sm tracking-widest uppercase text-[var(--color-champagne)]">
          ← Dashboard
        </Link>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="pt-16 min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)]">
            ← Dashboard
          </Link>
          <span className="text-sm text-[var(--color-silver)]">
            Video call with {session.other.name}
          </span>
        </div>

        <div className="flex-1 relative bg-black rounded-lg overflow-hidden aspect-video max-h-[70vh] flex items-center justify-center">
          {!room && (
            <p className="text-[var(--color-silver)] text-sm">Connecting camera…</p>
          )}
          {room && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoCallRemote room={room} />
              </div>
              <div className="absolute bottom-4 right-4 w-40 aspect-video rounded border-2 border-[var(--color-border)] overflow-hidden bg-[var(--color-charcoal)]">
                <VideoCallLocal room={room} />
              </div>
            </>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2 py-1 bg-green-600/90 text-white text-xs font-medium rounded">
              {timeLeft}
            </span>
            <span className="text-white/90 text-sm">{session.other.name}</span>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-sm text-amber-200/90">{error}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {user?.role === "client" && (
            <button
              type="button"
              onClick={extendCall}
              disabled={extending}
              className="px-5 py-2.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50 rounded-sm"
            >
              {extending ? "Extending…" : "Extend (+2 min, 1 credit)"}
            </button>
          )}
          <button
            type="button"
            onClick={endCall}
            disabled={ending}
            className="px-5 py-2.5 text-sm tracking-widest uppercase border border-red-500/80 text-red-300 hover:bg-red-500/20 disabled:opacity-50 rounded-sm"
          >
            {ending ? "Ending…" : "End call"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoCallRemote({ room }: { room: Room }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoEl || !room) return;
    const onTrackSubscribed = (
      track: { kind: string; mediaStreamTrack: MediaStreamTrack; attach?: (el: HTMLVideoElement) => HTMLVideoElement },
      _pub: unknown,
      _p: unknown
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
    const onLocalTrackPublished = (
      publication: { kind: string; track?: { attach?: (el: HTMLVideoElement) => HTMLVideoElement; mediaStreamTrack?: MediaStreamTrack } },
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
