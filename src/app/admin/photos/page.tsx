"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type PendingPhoto = {
  id: string;
  imageUrl: string;
  createdAt: string;
  escort: { id: string; aliasName: string; email: string | null };
};

function AdminPhotoImage({ photoId, token }: { photoId: string; token: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!photoId || !token) return;
    let revoked = false;
    fetch(`/api/photos/${photoId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.blob();
      })
      .then((blob) => {
        if (revoked) return;
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      revoked = true;
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
      setSrc(null);
    };
  }, [photoId, token]);

  if (!src) {
    return <div className="w-full aspect-square bg-[var(--color-slate)] animate-pulse" />;
  }
  return <img src={src} alt="" className="w-full aspect-square object-cover bg-black" />;
}

export default function AdminPhotosPage() {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/photos/pending", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => setPhotos(Array.isArray(d.photos) ? d.photos : []))
      .catch(() => setError("Could not load pending photos."))
      .finally(() => setLoading(false));
  }, [token]);

  async function review(photoId: string, action: "approve" | "reject") {
    if (!token) return;
    const reason = prompt(action === "approve" ? "Optional note (leave blank for none):" : "Reason (optional):") ?? "";
    const allowGallery = action === "approve" ? confirm("Allow for gallery/SEO?") : false;
    setReviewing(photoId);
    try {
      const res = await fetch(`/api/admin/photos/${photoId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason: reason.trim() || undefined, allowGallery }),
      });
      if (!res.ok) throw new Error("Failed");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError("Could not update photo.");
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
        ← Admin
      </Link>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">Escort photos</h1>
      <p className="text-sm text-[var(--color-silver)] mb-6">Review pending uploads and approve/reject.</p>

      {loading && <p className="text-[var(--color-silver)]">Loading…</p>}
      {error && <p className="text-red-300/90 text-sm">{error}</p>}

      {!loading && !error && photos.length === 0 && (
        <p className="text-[var(--color-silver)]">No pending photos.</p>
      )}

      {photos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded overflow-hidden">
              <AdminPhotoImage photoId={p.id} token={token} />
              <div className="p-4 space-y-2">
                <p className="text-sm text-[var(--color-ivory)] font-light">
                  {p.escort.aliasName} <span className="text-[var(--color-muted)]">({p.escort.email ?? "—"})</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => review(p.id, "approve")}
                    disabled={reviewing === p.id}
                    className="flex-1 px-3 py-2 text-xs tracking-widest uppercase border border-green-500/60 text-green-300 hover:bg-green-500/10 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => review(p.id, "reject")}
                    disabled={reviewing === p.id}
                    className="flex-1 px-3 py-2 text-xs tracking-widest uppercase border border-red-500/60 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
                <Link
                  href={`/escorts/${p.escort.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-[var(--color-silver)] hover:text-[var(--color-ivory)] underline underline-offset-4"
                >
                  View escort profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

