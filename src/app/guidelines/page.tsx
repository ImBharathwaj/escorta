"use client";

import Link from "next/link";

export default function GuidelinesPage() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-8 transition"
        >
          ← Home
        </Link>
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
          Legal
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-[var(--color-ivory)] tracking-wide mb-6">
          Community Guidelines
        </h1>
        <p className="text-[var(--color-silver)] text-sm mb-6">
          These guidelines explain what is and is not acceptable behaviour on Escorta. They are
          designed to help keep the platform respectful, consensual, and safe.
        </p>
        <div className="space-y-6 text-sm text-[var(--color-silver)] leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              1. Respect and consent
            </h2>
            <p>
              Always treat other members and companions with respect. Do not pressure anyone into
              activities they are uncomfortable with. All interactions — including chat, calls, and
              meetups — must be consensual.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              2. Prohibited content
            </h2>
            <p>
              Do not share content that is illegal, hateful, violent, non‑consensual, or involves
              minors. This includes text, images, and any media shared through chat or live/video
              features.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              3. No harassment or bullying
            </h2>
            <p>
              Harassment, stalking, threats, or repeated unwanted messages are not allowed. If
              someone asks you to stop contacting them, you must respect that.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              4. No scams or fraud
            </h2>
            <p>
              Do not use Escorta to run scams, solicit money under false pretences, or attempt to
              obtain financial information from other users. Report suspicious behaviour to support.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              5. Reporting and enforcement
            </h2>
            <p>
              You can report users, chats, or sessions that violate these guidelines. We may warn,
              suspend, or permanently ban accounts that break the rules or create risk for others.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

