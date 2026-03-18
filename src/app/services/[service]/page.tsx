import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EscortCard } from "@/components/escort/EscortCard";
import { notFound } from "next/navigation";

export const revalidate = 120;

type Props = { params: Promise<{ service: string }> };

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  dinner: "Looking for a charming dinner companion? Browse verified companions available for dinner dates, fine dining, and evening outings.",
  travel: "Need a travel companion for your next trip? Find verified companions who offer travel companionship for weekend getaways and international adventures.",
  events: "Attending a gala, party, or corporate event? Find a sophisticated companion to join you and make every event memorable.",
  massage: "Discover companions who offer relaxing massage services. Browse verified profiles and book your session.",
  gfe: "Find companions offering the girlfriend experience. Genuine connection, conversation, and companionship.",
  overnight: "Looking for an overnight companion? Browse verified profiles of companions available for extended arrangements.",
  roleplay: "Explore companions who specialize in creative roleplay experiences. Discreet and professional.",
  fetish: "Discover companions who cater to specific preferences and fetish experiences. Browse verified profiles.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { service } = await params;
  const decoded = decodeURIComponent(service);
  const display = titleCase(decoded);
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";

  return {
    title: `${display} Companions | Escorta`,
    description: SERVICE_DESCRIPTIONS[decoded.toLowerCase()] ||
      `Find verified companions for ${decoded} on Escorta. Browse profiles and connect.`,
    alternates: { canonical: `${baseUrl}/services/${encodeURIComponent(decoded.toLowerCase())}` },
  };
}

export default async function ServiceCompanionsPage({ params }: Props) {
  const { service } = await params;
  const decoded = decodeURIComponent(service);
  const display = titleCase(decoded);

  const escorts = await prisma.escortProfile.findMany({
    where: {
      isActive: true,
      services: {
        some: { service: { name: { contains: decoded, mode: "insensitive" } } },
      },
    },
    include: {
      photos: {
        where: { isApproved: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (escorts.length === 0) {
    notFound();
  }

  const desc = SERVICE_DESCRIPTIONS[decoded.toLowerCase()] ||
    `Browse verified companions who offer ${decoded} services on Escorta.`;

  const baseUrl = process.env.APP_URL || "https://escorta.example.com";

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <Link
          href="/companions"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-10 transition"
        >
          ← All companions
        </Link>

        <div className="mb-14">
          <h1 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide">
            {display} Companions
          </h1>
          <p className="text-[var(--color-silver)] text-sm mt-2 font-light max-w-2xl">
            {desc}
          </p>
          <p className="text-[var(--color-muted)] text-xs mt-2">
            {escorts.length} companion{escorts.length !== 1 ? "s" : ""} available
          </p>
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
              photoId={e.photos[0]?.id ?? null}
              photoIds={e.photos.map((p) => p.id)}
            />
          ))}
        </div>

        <div className="mt-12 space-y-4 text-sm text-[var(--color-silver)] font-light">
          <p>
            Interested in other types of arrangements?{" "}
            <Link href="/companions" className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] underline underline-offset-4">
              Browse all companions
            </Link>
          </p>
          <p>
            Explore our{" "}
            <Link href="/gallery" className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] underline underline-offset-4">
              image gallery
            </Link>{" "}
            for inspiration.
          </p>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `${display} Companions`,
              description: desc,
              url: `${baseUrl}/services/${encodeURIComponent(decoded.toLowerCase())}`,
            }),
          }}
        />
      </div>
    </div>
  );
}
