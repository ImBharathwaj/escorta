"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BlurredImage } from "@/components/BlurredImage";
import { useAuth } from "@/contexts/AuthContext";

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
  photoIds?: string[];
};

const CAROUSEL_INTERVAL_MS = 2800;
const CROSSFADE_DURATION_MS = 400;

export function EscortCard({
  id,
  aliasName,
  age,
  city,
  gender,
  isVerified,
  isGenderVerified,
  photoId,
  photoIds = [],
}: EscortCardProps) {
  const { user, token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [visibleLayer, setVisibleLayer] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ids = photoIds.length > 0 ? photoIds : (photoId ? [photoId] : []);
  const hasCarousel = connected && ids.length > 1;
  const showCarousel = hasCarousel && hovered;
  const n = ids.length;
  const currentIndex = carouselIndex % n;
  const nextIndex = (currentIndex + 1) % n;
  const displayPhotoId = ids[currentIndex] ?? ids[0] ?? photoId;
  const currentPhotoId = ids[currentIndex] ?? photoId;
  const nextPhotoId = ids[nextIndex] ?? photoId;
  const layer0PhotoId = visibleLayer === 0 ? currentPhotoId : nextPhotoId;
  const layer1PhotoId = visibleLayer === 0 ? nextPhotoId : currentPhotoId;

  useEffect(() => {
    if (!token || user?.role !== "client") return;
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const conn = (data.bookings || []).find(
          (b: { escort?: { id: string }; escortId?: string }) =>
            (b.escort?.id || b.escortId) === id
        );
        setConnected(conn?.status === "accepted");
      })
      .catch(() => {});
  }, [token, user?.role, id]);

  useEffect(() => {
    if (!showCarousel) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    setCarouselIndex(0);
    setVisibleLayer(0);
    intervalRef.current = setInterval(() => {
      setCarouselIndex((i) => i + 1);
      setVisibleLayer((v) => 1 - v);
    }, CAROUSEL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showCarousel]);

  return (
    <Link
      href={`/escorts/${id}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <article className="relative border border-[var(--color-border)] bg-[var(--color-charcoal)] overflow-hidden rounded-sm hover:border-[var(--color-champagne)]/50 hover:shadow-[0_0_35px_rgba(201,169,98,0.12)] transition-all duration-500">
        <div className="relative overflow-hidden bg-[var(--color-slate)] aspect-[3/4]">
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[var(--color-obsidian)] via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
          {!connected && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
              <span className="px-6 py-3 text-sm tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] bg-[var(--color-obsidian)]/80 backdrop-blur-sm">
                View profile
              </span>
            </div>
          )}
          {hasCarousel ? (
            <>
              <div
                className="absolute inset-0 z-[2] transition-opacity ease-out"
                style={{
                  transitionDuration: `${CROSSFADE_DURATION_MS}ms`,
                  opacity: showCarousel ? (visibleLayer === 0 ? 1 : 0) : 1,
                  zIndex: visibleLayer === 0 ? 3 : 2,
                }}
              >
                <BlurredImage
                  photoId={layer0PhotoId}
                  alt={aliasName}
                  aspect="card"
                  skipPremiumOverlay
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
                />
              </div>
              <div
                className="absolute inset-0 z-[2] transition-opacity ease-out"
                style={{
                  transitionDuration: `${CROSSFADE_DURATION_MS}ms`,
                  opacity: showCarousel ? (visibleLayer === 1 ? 1 : 0) : 0,
                  zIndex: visibleLayer === 1 ? 3 : 2,
                }}
              >
                <BlurredImage
                  photoId={layer1PhotoId}
                  alt={aliasName}
                  aspect="card"
                  skipPremiumOverlay
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0">
              <BlurredImage
                photoId={displayPhotoId}
                alt={aliasName}
                aspect="card"
                skipPremiumOverlay
                className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
              />
            </div>
          )}
          {(isVerified || (isGenderVerified && gender === "female")) && (
            <span className="absolute top-4 right-4 z-[4] px-2 py-1 text-[10px] tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] bg-[var(--color-obsidian)]/60 backdrop-blur-sm">
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
