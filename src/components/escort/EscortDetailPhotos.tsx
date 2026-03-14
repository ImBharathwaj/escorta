"use client";

import { BlurredImage } from "@/components/BlurredImage";

type Photo = { id: string };

type Props = {
  primaryPhotoId: string | null;
  photos: Photo[];
};

export function EscortDetailPhotos({ primaryPhotoId, photos }: Props) {
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
      {photos.length > 1 && (
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
