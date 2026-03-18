"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BlurredImage } from "@/components/BlurredImage";

type Photo = { id: string };

type Props = {
  escortId: string;
  primaryPhotoId: string | null;
  photos: Photo[];
};

export function EscortDetailPhotos({ escortId, primaryPhotoId, photos }: Props) {
  const ordered = primaryPhotoId
    ? [primaryPhotoId, ...photos.filter((p) => p.id !== primaryPhotoId).map((p) => p.id)]
    : photos.map((p) => p.id);

  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIdx(0);
  }, [escortId]);

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : ordered.length - 1)), [ordered.length]);
  const next = useCallback(() => setIdx((i) => (i < ordered.length - 1 ? i + 1 : 0)), [ordered.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    if (touchDeltaX.current < -40) next();
    else if (touchDeltaX.current > 40) prev();
  };

  if (ordered.length === 0) {
    return (
      <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded-sm aspect-[3/4] sm:aspect-[4/5] flex items-center justify-center">
        <span className="text-[var(--color-muted)] text-4xl font-light">—</span>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] overflow-hidden rounded-sm">
      {/* Main photo carousel */}
      <div
        ref={containerRef}
        className="relative bg-[var(--color-slate)] aspect-[3/4] sm:aspect-[4/5] overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <BlurredImage
          key={ordered[idx]}
          photoId={ordered[idx]}
          alt=""
          aspect="thumbnail"
          className="w-full h-full object-cover"
        />

        {/* Prev / Next tap zones */}
        {ordered.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer focus:outline-none group"
            >
              <span className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer focus:outline-none group"
            >
              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </span>
            </button>
          </>
        )}

        {/* Counter badge */}
        {ordered.length > 1 && (
          <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium tabular-nums">
            {idx + 1} / {ordered.length}
          </span>
        )}

        {/* Dot indicators */}
        {ordered.length > 1 && ordered.length <= 12 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {ordered.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Photo ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  i === idx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
