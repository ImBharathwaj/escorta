import Link from "next/link";

export default function HomePage() {
  return (
    <div className="pt-16">
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

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-12">
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
            <Link href="/login" className="hover:text-[var(--color-ivory)] transition">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
