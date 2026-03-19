"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
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
const mobileLinkClass =
  "flex items-center gap-3 px-4 py-3 text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:bg-[var(--color-charcoal)] rounded-sm transition";

export function Header() {
  const { user, token, authReady } = useAuth();
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const authPending = !authReady || (token != null && user == null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

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
        .catch(() => {});
    }
  }, [user, token, authReady]);

  const AvatarBadge = () => (
    <div className="w-8 h-8 rounded-full border border-[var(--color-border)] overflow-hidden bg-[var(--color-charcoal)] flex items-center justify-center text-xs text-[var(--color-ivory)]">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={user?.displayName || user?.email || "Account"}
          className="w-full h-full object-cover"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : (
        <span className="font-medium">{avatarInitial}</span>
      )}
    </div>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)]/80 bg-[var(--color-obsidian)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-medium tracking-[0.2em] uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
          >
            Escorta
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
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
                <AvatarBadge />
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

          {/* Mobile: key actions + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            {user?.role === "client" && (
              <span
                className="flex items-center gap-1 px-1.5 text-[var(--color-silver)]"
                title="Credits"
              >
                <IconCredits />
                <span className="text-xs text-[var(--color-champagne)] font-medium">
                  {user?.credits ?? 0}
                </span>
              </span>
            )}
            {(user?.role === "client" || user?.role === "escort") && <NotificationBell />}
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-out sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMenu}
          />
          <aside className="absolute top-0 right-0 h-full w-72 max-w-[80vw] bg-[var(--color-obsidian)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-slide-in-right">
            {/* Sidebar header */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium tracking-[0.15em] uppercase text-[var(--color-champagne)]">
                Escorta
              </span>
              <button
                onClick={closeMenu}
                className="p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Sidebar nav */}
            <nav className="flex-1 overflow-y-auto py-3 px-2">
              {user?.role !== "escort" && (
                <Link href="/companions" className={mobileLinkClass}>
                  <span>Companions</span>
                </Link>
              )}
              <Link href="/gallery" className={mobileLinkClass}>
                <span>Gallery</span>
              </Link>
              {user?.role === "client" && (
                <Link href="/live" className={mobileLinkClass}>
                  <IconLive />
                  <span>Live</span>
                </Link>
              )}
              {user?.role === "escort" && (
                <Link href="/live/go" className={mobileLinkClass}>
                  <IconGoLive />
                  <span>Go live</span>
                </Link>
              )}
              {(user?.role === "client" || user?.role === "escort") && (
                <Link href="/sexter" className={mobileLinkClass}>
                  <IconSexter />
                  <span>Sexter</span>
                </Link>
              )}
              {user?.role === "client" && !user.isPremiumMember && (
                <Link href="/membership" className={mobileLinkClass}>
                  <IconUnlock />
                  <span>Unlock premium</span>
                </Link>
              )}
              {user && (
                <>
                  <div className="my-2 border-t border-[var(--color-border)]" />
                  <Link href="/dashboard" className={mobileLinkClass}>
                    <span>Dashboard</span>
                  </Link>
                  <Link href="/settings" className={mobileLinkClass}>
                    <span>Settings</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Sidebar footer */}
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              {authPending ? (
                <span className="text-sm text-[var(--color-silver)]/60">…</span>
              ) : user ? (
                <div className="flex items-center gap-3">
                  <AvatarBadge />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--color-ivory)] truncate">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] truncate">
                      {user.role}
                    </p>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-sm text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
                >
                  <IconSignIn />
                  <span>Sign in</span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
