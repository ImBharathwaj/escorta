"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CompanionsLink } from "@/components/CompanionsLink";
import { NotificationBell } from "@/components/NotificationBell";
import {
  IconLive,
  IconGoLive,
  IconSexter,
  IconUnlock,
  IconAccount,
  IconSignIn,
  IconCredits,
} from "@/components/icons/NavIcons";

const navLinkClass =
  "p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition rounded-sm";

export function Header() {
  const { user, token, authReady } = useAuth();
  const authPending = !authReady || (token != null && user == null);

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
              className={navLinkClass}
              aria-label="Account"
            >
              <IconAccount />
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
