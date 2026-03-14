"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  photoId: string | null;
  alt: string;
  className?: string;
  aspect?: "card" | "detail" | "thumbnail";
};

export function BlurredImage({ photoId, alt, className = "", aspect = "card" }: Props) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const isPremium =
    user?.role === "escort" ? true : user?.role === "client" ? user?.isPremiumMember === true : false;

  const aspectClass =
    aspect === "card"
      ? "aspect-[3/4]"
      : aspect === "detail"
        ? "aspect-[4/5]"
        : "";

  const [isFullImage, setIsFullImage] = useState(false);

  const fetchImage = useCallback(() => {
    if (!photoId) return;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`/api/photos/${photoId}`, { headers, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        const full = r.headers.get("X-Image-Full") === "true";
        setIsFullImage(full);
        return r.blob();
      })
      .then((blob) => {
        const toRevoke = blobUrlRef.current;
        if (toRevoke) URL.revokeObjectURL(toRevoke);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {});
  }, [photoId, token]);

  useEffect(() => {
    if (!photoId) return;
    let revoked = false;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`/api/photos/${photoId}`, { headers, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        const full = r.headers.get("X-Image-Full") === "true";
        if (!revoked) setIsFullImage(full);
        return r.blob();
      })
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {});
    return () => {
      revoked = true;
      const toRevoke = blobUrlRef.current;
      blobUrlRef.current = null;
      if (toRevoke) URL.revokeObjectURL(toRevoke);
      setBlobUrl(null);
      setIsFullImage(false);
    };
  }, [photoId, token]);

  useEffect(() => {
    if (user?.role !== "client" || !photoId) return;
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchImage();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [user?.role, photoId, fetchImage]);

  if (!photoId) {
    return (
      <div
        className={`flex items-center justify-center text-[var(--color-muted)] text-5xl font-light bg-[var(--color-slate)] ${aspectClass} ${className}`}
      >
        —
      </div>
    );
  }

  const noDownloadProps = {
    draggable: false,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties,
  };

  const showFull = isPremium || isFullImage;
  if (showFull && blobUrl) {
    return (
      <div
        className={`${aspectClass} ${className}`}
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >
        <img
          src={blobUrl}
          alt={alt}
          className="w-full h-full object-cover pointer-events-none"
          {...noDownloadProps}
        />
      </div>
    );
  }

  if (showFull && !blobUrl) {
    return (
      <div
        className={`flex items-center justify-center text-[var(--color-muted)] bg-[var(--color-slate)] animate-pulse ${aspectClass} ${className}`}
      >
        —
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${aspectClass} ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {blobUrl && (
        <img
          src={blobUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          aria-hidden
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-obsidian)]/60">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-silver)] mb-3">
          Premium content
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push("/membership");
          }}
          className="px-5 py-2.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
        >
          Unlock to view
        </button>
      </div>
    </div>
  );
}
