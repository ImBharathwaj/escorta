"use client";

import { useState, useEffect } from "react";
import { BlurredImage } from "@/components/BlurredImage";
import { useAuth } from "@/contexts/AuthContext";

type Photo = { id: string };

type Props = {
  escortId: string;
  primaryPhotoId: string | null;
  photos: Photo[];
};

export function EscortDetailPhotos({ escortId, primaryPhotoId, photos }: Props) {
  const { user, token } = useAuth();
  const [showOnlyPrimary, setShowOnlyPrimary] = useState(false);

  useEffect(() => {
    if (user?.role !== "client" || !token) {
      setShowOnlyPrimary(false);
      return;
    }
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const connected = (data.bookings || []).some(
          (b: { escort?: { id: string }; status: string }) =>
            b.escort?.id === escortId && b.status === "accepted"
        );
        setShowOnlyPrimary(connected);
      })
      .catch(() => setShowOnlyPrimary(false));
  }, [escortId, user?.role, token]);

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] overflow-hidden rounded-sm">
      <div className="bg-[var(--color-slate)]">
        <BlurredImage
          photoId={primaryPhotoId}
          alt=""
          aspect="detail"
          className="w-full"
        />
      </div>
      {!showOnlyPrimary && photos.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto border-t border-[var(--color-border)]">
          {photos.map((p) => (
            <div key={p.id} className="flex-shrink-0 w-16 h-16 overflow-hidden border border-[var(--color-border)]">
              <BlurredImage
                photoId={p.id}
                alt=""
                aspect="thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
