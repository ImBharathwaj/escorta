"use client";

import Link from "next/link";
import { BlurredImage } from "@/components/BlurredImage";

type EscortCardProps = {
  id: string;
  aliasName: string;
  age: number | null;
  city: string | null;
  gender: string | null;
  pricePerHour?: number | null;
  isVerified: boolean;
  isGenderVerified: boolean;
  photoId: string | null;
};

export function EscortCard({
  id,
  aliasName,
  age,
  city,
  gender,
  isVerified,
  isGenderVerified,
  photoId,
}: EscortCardProps) {
  return (
    <Link href={`/escorts/${id}`} className="group block">
      <article className="relative border border-[var(--color-border)] bg-[var(--color-charcoal)] overflow-hidden rounded-sm hover:border-[var(--color-champagne)]/50 hover:shadow-[0_0_35px_rgba(201,169,98,0.12)] transition-all duration-500">
        <div className="relative overflow-hidden bg-[var(--color-slate)]">
          <BlurredImage
            photoId={photoId}
            alt={aliasName}
            aspect="card"
            className="group-hover:scale-[1.05] transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-obsidian)] via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="px-6 py-3 text-sm tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] bg-[var(--color-obsidian)]/80 backdrop-blur-sm">
              View profile
            </span>
          </div>
          {(isVerified || (isGenderVerified && gender === "female")) && (
            <span className="absolute top-4 right-4 px-2 py-1 text-[10px] tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] bg-[var(--color-obsidian)]/60 backdrop-blur-sm">
              {isGenderVerified && gender === "female" ? "Verified female" : "Verified"}
            </span>
          )}
        </div>
        <div className="p-5 group-hover:bg-[var(--color-charcoal)]/80 transition-colors duration-300">
          <h3 className="text-lg font-medium text-[var(--color-ivory)] tracking-wide truncate group-hover:text-[var(--color-champagne-light)] transition-colors">
            {aliasName}
          </h3>
          <div className="flex justify-between items-baseline mt-2 text-sm text-[var(--color-silver)] font-light">
            <span>
              {age && `${age}`}
              {gender && ` · ${gender}`}
              {city && ` · ${city}`}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
