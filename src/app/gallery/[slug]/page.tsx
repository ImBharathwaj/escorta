import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GalleryZoomGrid } from "@/components/GalleryZoomGrid";

export const revalidate = 60;

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    return {
      title: "Companion gallery | Escorta",
      description: "Curated image galleries of companions and meetups on Escorta.",
    };
  }

  const gallery = await prisma.gallery.findUnique({
    where: { slug },
  });
  if (!gallery) {
    return {
      title: "Companion gallery | Escorta",
      description: "Curated image galleries of companions and meetups on Escorta.",
    };
  }
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";
  return {
    title: gallery.title,
    description: gallery.description,
    alternates: {
      canonical: `${baseUrl}/gallery/${gallery.slug}`,
    },
  };
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  const gallery = await prisma.gallery.findUnique({
    where: { slug },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!gallery) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">
            Gallery not found
          </h1>
          <p className="text-[var(--color-silver)] font-light mb-4 text-sm">
            This gallery does not exist or is no longer available.
          </p>
          <Link
            href="/gallery"
            className="inline-block px-6 py-3 text-xs tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
          >
            ← Back to gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-3">
            Image gallery
          </p>
          <h1 className="text-3xl md:text-4xl font-light text-[var(--color-ivory)] tracking-wide mb-3">
            {gallery.h1}
          </h1>
          <p className="text-[var(--color-silver)] font-light max-w-2xl text-sm md:text-base mb-4">
            {gallery.description}
          </p>
        </div>

        <GalleryZoomGrid
          images={gallery.images.map((img) => ({
            id: img.id,
            src: `/api/media?src=${encodeURIComponent(img.src)}`,
            alt: img.alt,
            caption: img.caption,
          }))}
        />

        <div className="mt-10 text-sm text-[var(--color-silver)] font-light">
          <p>
            Want to meet real companions like the ones in this gallery?{" "}
            <Link
              href="/companions"
              className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] underline underline-offset-4"
            >
              Browse companions
            </Link>
            .
          </p>
        </div>

        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: gallery.h1,
              description: gallery.description,
              hasPart: gallery.images.map((img) => ({
                "@type": "ImageObject",
                contentUrl: `/api/media?src=${encodeURIComponent(img.src)}`,
                caption: img.caption ?? img.alt,
              })),
            }),
          }}
        />
      </div>
    </div>
  );
}

