export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const baseUrl = process.env.APP_URL || "https://escorta.example.com";

export const metadata: Metadata = {
  title: "Companion Image Gallery | Escorta",
  description:
    "Explore curated, tasteful companion galleries. Discover meetup styles, arrangements, and find your ideal companion on Escorta.",
  alternates: { canonical: `${baseUrl}/gallery` },
};

export default async function GalleryIndexPage() {
  const galleries = await prisma.gallery.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-3">
            Image gallery
          </p>
          <h1 className="text-3xl md:text-4xl font-light text-[var(--color-ivory)] tracking-wide mb-3">
            Companion image gallery
          </h1>
          <p className="text-[var(--color-silver)] font-light max-w-2xl text-sm md:text-base">
            Explore curated, non‑explicit imagery that reflects different types of meetups and
            arrangements. These galleries help new visitors imagine use‑cases and improve how Escorta
            appears in image search for relevant companion discovery keywords.
          </p>
        </div>

        {galleries.length === 0 ? (
          <p className="text-[var(--color-silver)] font-light text-sm">
            Galleries are being curated. Please check back soon.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {galleries.map((g) => {
              const hero = g.images[0] ?? null;
              return (
                <Link
                  key={g.slug}
                  href={`/gallery/${g.slug}`}
                  className="group border border-[var(--color-border)] bg-[var(--color-charcoal)]/60 rounded-sm overflow-hidden flex flex-col hover:border-[var(--color-champagne)]/60 transition"
                >
                  {hero ? (
                    <img
                      src={`/api/media?src=${encodeURIComponent(hero.src)}`}
                      alt={hero.alt || g.h1}
                      className="w-full max-h-[260px] object-contain bg-[var(--color-obsidian)]"
                    />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center text-xs text-[var(--color-silver)] font-light bg-[var(--color-obsidian)]">
                      No images yet
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="text-lg font-light text-[var(--color-ivory)] mb-2">
                      {g.h1}
                    </h2>
                    <p className="text-sm text-[var(--color-silver)] font-light line-clamp-3 mb-3">
                      {g.description}
                    </p>
                    <span className="mt-auto text-xs tracking-[0.2em] uppercase text-[var(--color-champagne)]">
                      View gallery →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10 space-y-3 text-sm text-[var(--color-silver)] font-light">
          <p>
            Looking for specific companions?{" "}
            <Link
              href="/companions"
              className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] underline underline-offset-4"
            >
              Browse companions
            </Link>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {["Dinner", "Travel", "Events", "GFE", "Massage", "Overnight"].map((s) => (
              <Link
                key={s}
                href={`/services/${s.toLowerCase()}`}
                className="px-3 py-1 text-xs border border-[var(--color-border)] text-[var(--color-silver)] hover:border-[var(--color-champagne)]/50 hover:text-[var(--color-champagne)] transition rounded-sm"
              >
                {s} companions
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

