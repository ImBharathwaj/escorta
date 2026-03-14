"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CompanionsLink } from "@/components/CompanionsLink";

export function Header() {
  const { user, authReady } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border)]/80 bg-[var(--color-obsidian)]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-medium tracking-[0.2em] uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
        >
          Escorta
        </Link>
        <nav className="flex items-center gap-8">
          {user?.role === "client" && (
            <span className="text-sm text-[var(--color-silver)]">
              Credits: <span className="text-[var(--color-champagne)] font-medium">{user?.credits ?? 0}</span>
            </span>
          )}
          {user?.role !== "escort" && <CompanionsLink />}
          {user?.role === "client" && !user.isPremiumMember && (
            <Link
              href="/membership"
              className="text-sm tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
            >
              Unlock
            </Link>
          )}
          {!authReady ? (
            <span className="text-sm tracking-widest uppercase text-[var(--color-silver)]/60">
              …
            </span>
          ) : user ? (
            <Link
              href="/dashboard"
              className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
