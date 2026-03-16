"use client";

import Link from "next/link";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-[var(--color-silver)] text-sm mb-6">
          This page outlines the core terms under which you may use Escorta. It is a starting point
          and should be reviewed and expanded with local legal counsel before launch.
        </p>
        <div className="space-y-6 text-sm text-[var(--color-silver)] leading-relaxed">
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              1. Service description
            </h2>
            <p>
              Escorta is a companion discovery and communication platform. We provide tools for
              members and companions to discover each other and communicate via chat and video. We
              do not act as an agent, broker, or employer of companions, and we do not process or
              guarantee any offline arrangements or payments between users.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              2. Eligibility & age
            </h2>
            <p>
              You must be at least 18 years old (or the age of majority in your jurisdiction,
              whichever is higher) to use Escorta. By creating an account or using the service, you
              confirm that you meet this requirement and that you will not allow anyone underage to
              access your account.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              3. User responsibilities
            </h2>
            <p>
              You are responsible for all activity on your account and for any content you share on
              Escorta. You agree not to upload illegal, abusive, or non‑consensual content, and not
              to use the platform for harassment, trafficking, or any other unlawful purpose.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              4. No guarantees for offline meetings
            </h2>
            <p>
              If you choose to meet another user in person, you do so entirely at your own risk. We
              do not vet, verify, supervise, or control offline meetings. You should always follow
              basic safety precautions and never share more personal information than you are
              comfortable with.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              5. Account suspension
            </h2>
            <p>
              We may suspend or terminate your account, at our sole discretion, if we believe you
              have violated these Terms, our Community Guidelines, or any applicable law, or if your
              behaviour creates risk for other users or the platform.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-[var(--color-ivory)] mb-1">
              6. Changes to these terms
            </h2>
            <p>
              We may update these Terms from time to time. When we do, we will update the effective
              date on this page. If changes are significant, we may also notify you via email or an
              in‑app notification.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

