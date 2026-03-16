"use client";

import { useState, useEffect } from "react";

type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  caption: string | null;
};

export function GalleryZoomGrid({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState<GalleryImage | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        {images.map((img) => (
          <figure
            key={img.id}
            className="border border-[var(--color-border)] bg-[var(--color-charcoal)]/60 rounded-sm overflow-hidden cursor-zoom-in"
            onClick={() => setActive(img)}
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-auto max-h-[480px] object-contain bg-[var(--color-obsidian)]"
            />
            {(img.caption || img.alt) && (
              <figcaption className="px-4 py-3 text-xs text-[var(--color-silver)] font-light">
                {img.caption || img.alt}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 cursor-zoom-out"
          onClick={() => setActive(null)}
          role="presentation"
        >
          <div
            className="max-w-5xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.src}
              alt={active.alt}
              className="max-w-full max-h-[80vh] object-contain rounded-sm bg-[var(--color-obsidian)]"
            />
            {(active.caption || active.alt) && (
              <p className="mt-3 text-xs text-[var(--color-silver)] text-center max-w-xl">
                {active.caption || active.alt}
              </p>
            )}
            <button
              type="button"
              onClick={() => setActive(null)}
              className="mt-4 px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase border border-[var(--color-silver)] text-[var(--color-silver)] hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

