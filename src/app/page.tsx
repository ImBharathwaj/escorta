"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { EscortCard } from "@/components/escort/EscortCard";

type SpotlightedEscort = {
  id: string;
  aliasName: string;
  age: number | null;
  city: string | null;
  gender: string | null;
  isVerified: boolean;
  isGenderVerified: boolean;
  photoId: string | null;
};

function SpotlightedSection() {
  const [escorts, setEscorts] = useState<SpotlightedEscort[]>([]);

  useEffect(() => {
    fetch("/api/spotlighted")
      .then((r) => r.json())
      .then((data) => setEscorts(data.spotlighted || []))
      .catch(() => {});
  }, []);

  if (escorts.length === 0) return null;

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
              Featured
            </p>
            <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide">
              Spotlighted companions
            </h2>
          </div>
          <Link
            href="/companions"
            className="text-sm text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition underline underline-offset-4"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {escorts.map((e) => (
            <EscortCard
              key={e.id}
              id={e.id}
              aliasName={e.aliasName}
              age={e.age}
              city={e.city}
              gender={e.gender}
              isVerified={e.isVerified}
              isGenderVerified={e.isGenderVerified}
              photoId={e.photoId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function GuestHome() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col justify-center px-6 lg:px-8 py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-champagne)]/5 via-transparent to-[var(--color-obsidian)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_70%_20%,var(--color-champagne-dim),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-6 opacity-90">
            Escorta — Companion Discovery Platform
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-light text-[var(--color-ivory)] max-w-3xl leading-[1.1] tracking-tight">
            Where elegance meets connection.
          </h1>
          <p className="mt-8 text-[var(--color-silver)] font-light max-w-xl text-lg leading-relaxed">
            A curated platform for discerning individuals seeking refined companionship. Discover arrangements, meetups, and meaningful social connections.
          </p>
          <Link
            href="/companions"
            className="inline-block mt-12 px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
          >
            Browse companions
          </Link>
        </div>
      </section>

      {/* About Escorta */}
      <section className="border-y border-[var(--color-border)] py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-8">
            About Escorta
          </h2>
          <p className="text-[var(--color-pearl)] font-light text-lg leading-relaxed mb-6">
            Escorta is India&apos;s premier companion discovery platform. We bring together discerning clients and handpicked companions for arrangements, meetups, dinner dates, travel, events, and meaningful social connections.
          </p>
          <p className="text-[var(--color-silver)] font-light leading-relaxed">
            Every companion on our platform is vetted. We prioritise discretion, quality, and authenticity—so you can connect with confidence.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <span className="text-4xl font-light text-[var(--color-champagne)]/60">01</span>
              <h3 className="text-lg font-light text-[var(--color-ivory)] mt-4 mb-2">Browse</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Explore our curated selection of companions. Filter by city, preferences, and meetup types.
              </p>
            </div>
            <div>
              <span className="text-4xl font-light text-[var(--color-champagne)]/60">02</span>
              <h3 className="text-lg font-light text-[var(--color-ivory)] mt-4 mb-2">Connect</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Sign in and send a connection request with an optional intro message. The companion chooses.
              </p>
            </div>
            <div>
              <span className="text-4xl font-light text-[var(--color-champagne)]/60">03</span>
              <h3 className="text-lg font-light text-[var(--color-ivory)] mt-4 mb-2">Chat</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Once accepted, chat directly to arrange meetups and arrangements at your convenience.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SpotlightedSection />

      {/* Why Escorta */}
      <section className="border-y border-[var(--color-border)] py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-12">
            Why Escorta
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm">
              <h3 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">Discreet</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Your privacy is paramount. All interactions are handled with the utmost discretion.
              </p>
            </div>
            <div className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm">
              <h3 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">Verified</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Companions are vetted. Look for the verified badge for added assurance.
              </p>
            </div>
            <div className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm">
              <h3 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">Curated</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Handpicked profiles. No clutter—only quality companions for every occasion.
              </p>
            </div>
            <div className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm">
              <h3 className="text-sm tracking-[0.2em] uppercase text-[var(--color-champagne)] mb-3">Flexible</h3>
              <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
                Dinner dates, travel, events, or social companionship. Find what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Image gallery CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
            Browse our image gallery
          </h2>
          <p className="text-[var(--color-silver)] font-light mb-8 text-sm md:text-base">
            See curated, non‑explicit images that reflect different companion scenarios—dinner dates,
            travel, and events across India. These galleries help you visualise what&apos;s possible with
            Escorta.
          </p>
          <Link
            href="/gallery"
            className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
          >
            View image gallery
          </Link>
        </div>
      </section>

      {/* CTA — Browse companions */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
            Ready to connect?
          </h2>
          <p className="text-[var(--color-silver)] font-light mb-8 max-w-xl mx-auto">
            Browse our curated selection of companions and find the perfect match for your occasion.
          </p>
          <Link
            href="/companions"
            className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
          >
            Browse companions
          </Link>
        </div>
      </section>

      {/* Join as companion CTA */}
      <section className="border-t border-[var(--color-border)] py-24">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
            Are you a companion?
          </h2>
          <p className="text-[var(--color-silver)] font-light mb-8 max-w-xl mx-auto">
            Join our exclusive community. Create your profile and connect with discerning clients for arrangements and meetups.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
          >
            Apply to join
          </Link>
        </div>
      </section>
    </>
  );
}

function ClientHome() {
  return (
    <>
      <section className="relative min-h-[50vh] flex flex-col justify-center px-6 lg:px-8 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-champagne)]/5 via-transparent to-[var(--color-obsidian)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-4 opacity-90">
            Welcome back
          </p>
          <h1 className="text-4xl md:text-5xl font-light text-[var(--color-ivory)] max-w-2xl leading-[1.15] tracking-tight">
            Discover and connect with companions.
          </h1>
          <p className="mt-6 text-[var(--color-silver)] font-light max-w-xl text-lg leading-relaxed">
            Browse profiles and connect with companions.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/companions"
              className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
            >
              Browse companions
            </Link>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:border-[var(--color-silver)]/50 transition"
            >
              Your account
            </Link>
          </div>
        </div>
      </section>

      <SpotlightedSection />

      <section className="border-y border-[var(--color-border)] py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-xl font-light text-[var(--color-ivory)] tracking-wide mb-8">
            Quick links
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/companions" className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm hover:border-[var(--color-champagne)]/40 transition block">
              <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-2">Companions</h3>
              <p className="text-[var(--color-silver)] font-light text-sm">Explore and connect with companions.</p>
            </Link>
            <Link href="/sexter" className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm hover:border-[var(--color-champagne)]/40 transition block">
              <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-2">Sexter</h3>
              <p className="text-[var(--color-silver)] font-light text-sm">Chat with companions using credits.</p>
            </Link>
            <Link href="/dashboard" className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm hover:border-[var(--color-champagne)]/40 transition block">
              <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-2">Account</h3>
              <p className="text-[var(--color-silver)] font-light text-sm">Your connections and profile.</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function EscortHome() {
  return (
    <>
      <section className="relative min-h-[50vh] flex flex-col justify-center px-6 lg:px-8 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-champagne)]/5 via-transparent to-[var(--color-obsidian)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto w-full">
          <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-4 opacity-90">
            Welcome back
          </p>
          <h1 className="text-4xl md:text-5xl font-light text-[var(--color-ivory)] max-w-2xl leading-[1.15] tracking-tight">
            Your companion dashboard.
          </h1>
          <p className="mt-6 text-[var(--color-silver)] font-light max-w-xl text-lg leading-relaxed">
            Manage your profile, view connection requests, and chat with clients. Use Sexter for paid chat sessions.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
            >
              Your account
            </Link>
            <Link
              href="/sexter"
              className="inline-block px-8 py-4 text-sm tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:border-[var(--color-silver)]/50 transition"
            >
              Sexter
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="text-xl font-light text-[var(--color-ivory)] tracking-wide mb-8">
            Quick links
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/dashboard" className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm hover:border-[var(--color-champagne)]/40 transition block">
              <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-2">Account</h3>
              <p className="text-[var(--color-silver)] font-light text-sm">Profile, connection requests, and chats.</p>
            </Link>
            <Link href="/sexter" className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm hover:border-[var(--color-champagne)]/40 transition block">
              <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-2">Sexter</h3>
              <p className="text-[var(--color-silver)] font-light text-sm">Paid chat sessions with clients.</p>
            </Link>
            <Link href="/dashboard/profile" className="p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 rounded-sm hover:border-[var(--color-champagne)]/40 transition block">
              <h3 className="text-sm tracking-[0.15em] uppercase text-[var(--color-champagne)] mb-2">Edit profile</h3>
              <p className="text-[var(--color-silver)] font-light text-sm">Update your photos and services.</p>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="pt-16 min-h-[40vh] flex items-center justify-center">
        <span className="text-[var(--color-silver)]/60">…</span>
      </div>
    );
  }

  return (
    <div className="pt-16">
      {user?.role === "client" && <ClientHome />}
      {user?.role === "escort" && <EscortHome />}
      {!user && <GuestHome />}

      {/* Footer — same for all */}
      <footer className="border-t border-[var(--color-border)] py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link
            href="/"
            className="text-lg font-medium tracking-[0.15em] uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
          >
            Escorta
          </Link>
          <div className="flex gap-8 text-sm text-[var(--color-silver)] font-light">
            <Link href="/companions" className="hover:text-[var(--color-ivory)] transition">
              Companions
            </Link>
            {!user && (
              <Link href="/login" className="hover:text-[var(--color-ivory)] transition">
                Sign in
              </Link>
            )}
            {user && (
              <Link href="/dashboard" className="hover:text-[var(--color-ivory)] transition">
                Account
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
