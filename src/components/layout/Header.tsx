"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CompanionsLink } from "@/components/CompanionsLink";
import { NotificationBell } from "@/components/NotificationBell";
import {
  IconLive,
  IconGoLive,
  IconSexter,
  IconUnlock,
  IconSignIn,
  IconCredits,
} from "@/components/icons/NavIcons";

const navLinkClass =
  "p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition rounded-sm";

export function Header() {
  const { user, token, authReady } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const authPending = !authReady || (token != null && user == null);

  const avatarInitial =
    (user?.displayName?.trim() || user?.email || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "A";

  useEffect(() => {
    if (!user || !authReady) {
      setAvatarUrl(null);
      return;
    }
    if (user.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
      return;
    }
    if (user.role === "escort" && token) {
      // Load primary escort photo as avatar if no user avatarUrl
      fetch("/api/escorts/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const photos = Array.isArray(data?.photos) ? data.photos : [];
          const primary = photos.find((p: any) => p.isPrimary) ?? photos[0];
          if (primary?.imageUrl) {
            setAvatarUrl(primary.imageUrl as string);
          }
        })
        .catch(() => {
          // ignore, fall back to initial
        });
    }
  }, [user, token, authReady]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)]/80 bg-[var(--color-obsidian)]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-medium tracking-[0.2em] uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
        >
          Escorta
        </Link>
        <nav className="flex items-center gap-2">
          {user?.role === "client" && (
            <span
              className="flex items-center gap-1.5 px-2 text-[var(--color-silver)]"
              title="Credits"
            >
              <IconCredits />
              <span className="text-sm">
                <span className="text-[var(--color-champagne)] font-medium">{user?.credits ?? 0}</span>
              </span>
            </span>
          )}
          {user?.role !== "escort" && <CompanionsLink />}
          {user?.role === "client" && (
            <Link href="/live" title="Live" className={navLinkClass} aria-label="Live">
              <IconLive />
            </Link>
          )}
          <Link
            href="/gallery"
            title="Image gallery"
            className={navLinkClass}
            aria-label="Image gallery"
          >
            <span className="text-sm">Gallery</span>
          </Link>
          {user?.role === "escort" && (
            <Link href="/live/go" title="Go live" className={navLinkClass} aria-label="Go live">
              <IconGoLive />
            </Link>
          )}
          {(user?.role === "client" || user?.role === "escort") && (
            <Link href="/sexter" title="Sexter" className={navLinkClass} aria-label="Sexter">
              <IconSexter />
            </Link>
          )}
          {user?.role === "client" && !user.isPremiumMember && (
            <Link
              href="/membership"
              title="Unlock"
              className="p-2 text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition rounded-sm"
              aria-label="Unlock"
            >
              <IconUnlock />
            </Link>
          )}
          {(user?.role === "client" || user?.role === "escort") && <NotificationBell />}
          {authPending ? (
            <span className="p-2 text-[var(--color-silver)]/60" aria-hidden>
              …
            </span>
          ) : user ? (
            <Link
              href="/dashboard"
              title="Account"
              aria-label="Account"
              className="flex items-center gap-2 pl-2 pr-0"
            >
              <div className="w-8 h-8 rounded-full border border-[var(--color-border)] overflow-hidden bg-[var(--color-charcoal)] flex items-center justify-center text-xs text-[var(--color-ivory)]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={user.displayName || user.email || "Account"}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <span className="font-medium">{avatarInitial}</span>
                )}
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              title="Sign in"
              className="p-2 text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition rounded-sm"
              aria-label="Sign in"
            >
              <IconSignIn />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
