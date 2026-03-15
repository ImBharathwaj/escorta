"use client";

import { useState, useEffect } from "react";
import { BlurredImage } from "@/components/BlurredImage";

type Photo = { id: string };

type Props = {
  escortId: string;
  primaryPhotoId: string | null;
  photos: Photo[];
};

export function EscortDetailPhotos({ escortId, primaryPhotoId, photos }: Props) {
  const initialId = primaryPhotoId ?? photos[0]?.id ?? null;
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(initialId);

  useEffect(() => {
    setSelectedPhotoId(initialId);
  }, [escortId, initialId]);

  const displayPhotoId = selectedPhotoId ?? initialId;

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] overflow-hidden rounded-sm">
      <div className="bg-[var(--color-slate)]">
        <BlurredImage
          photoId={displayPhotoId}
          alt=""
          aspect="detail"
          className="w-full"
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto border-t border-[var(--color-border)]">
          {photos.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPhotoId(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedPhotoId(p.id);
                }
              }}
              className={`flex-shrink-0 w-16 h-16 overflow-hidden border rounded-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-champagne)]/50 cursor-pointer ${
                p.id === displayPhotoId
                  ? "border-[var(--color-champagne)] ring-1 ring-[var(--color-champagne)]/50"
                  : "border-[var(--color-border)] hover:border-[var(--color-champagne)]/50"
              }`}
            >
              <BlurredImage
                photoId={p.id}
                alt=""
                aspect="thumbnail"
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
