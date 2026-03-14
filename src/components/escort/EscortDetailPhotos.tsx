"use client";

import { useState } from "react";
import { BlurredImage } from "@/components/BlurredImage";

type Photo = { id: string };

type Props = {
  escortId: string;
  primaryPhotoId: string | null;
  photos: Photo[];
};

export function EscortDetailPhotos({ primaryPhotoId, photos }: Props) {
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  const displayPhotoId = primaryPhotoId ?? photos[0]?.id ?? null;

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] overflow-hidden rounded-sm">
      <button
        type="button"
        onClick={() => displayPhotoId && setLightboxPhotoId(displayPhotoId)}
        className="block w-full text-left bg-[var(--color-slate)] focus:outline-none focus:ring-2 focus:ring-[var(--color-champagne)]/50 rounded-t-sm"
      >
        <BlurredImage
          photoId={displayPhotoId}
          alt=""
          aspect="detail"
          className="w-full cursor-pointer"
        />
      </button>
      {photos.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto border-t border-[var(--color-border)]">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setLightboxPhotoId(p.id)}
              className="flex-shrink-0 w-16 h-16 overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-champagne)]/50 transition focus:outline-none focus:ring-2 focus:ring-[var(--color-champagne)]/50 rounded-sm"
            >
              <BlurredImage
                photoId={p.id}
                alt=""
                aspect="thumbnail"
                className="w-full h-full object-cover pointer-events-none"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxPhotoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-obsidian)]/95 p-4"
          onClick={() => setLightboxPhotoId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="View photo"
        >
          <button
            type="button"
            onClick={() => setLightboxPhotoId(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-2xl text-[var(--color-silver)] hover:text-[var(--color-ivory)] border border-[var(--color-border)] rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-champagne)]/50"
            aria-label="Close"
          >
            ×
          </button>
          <div
            className="max-w-[95vw] max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-4xl min-h-[70vh] aspect-[4/5] max-h-[90vh] bg-[var(--color-slate)] rounded-sm overflow-hidden">
              <BlurredImage
                photoId={lightboxPhotoId}
                alt=""
                aspect="detail"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
