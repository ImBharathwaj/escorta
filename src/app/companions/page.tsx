import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EscortFilters from "@/components/escort/EscortFilters";
import { EscortCard } from "@/components/escort/EscortCard";

export const revalidate = 60;

const baseUrl = process.env.APP_URL || "https://escorta.example.com";

export const metadata: Metadata = {
  title: "Meet our companions | Escorta",
  description:
    "Browse verified companions. Filter by city, preferences, and arrange meetups, dinner dates, travel, and social connections.",
  alternates: { canonical: `${baseUrl}/companions` },
};

export default async function CompanionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const city = params.city;
  const gender = params.gender;
  const verifiedFemale = params.verifiedFemale === "1";
  const minAge = params.minAge;
  const maxAge = params.maxAge;
  const service = params.service;

  const where: Record<string, unknown> = { isActive: true };
  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }
  if (gender) {
    where.gender = gender;
  }
  if (verifiedFemale) {
    where.gender = "female";
    where.isGenderVerified = true;
  }
  if (minAge || maxAge) {
    where.age = {};
    if (minAge) (where.age as Record<string, number>).gte = parseInt(minAge);
    if (maxAge) (where.age as Record<string, number>).lte = parseInt(maxAge);
  }
  if (service) {
    where.services = {
      some: { service: { name: { contains: service, mode: "insensitive" } } },
    };
  }

  const escorts = await prisma.escortProfile.findMany({
    where,
    include: {
      photos: {
        where: { isApproved: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-10 transition"
        >
          ← Home
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-[var(--color-ivory)] tracking-wide">
              Meet our companions
            </h1>
            <p className="text-[var(--color-silver)] text-sm mt-2 font-light">
              Refine your search
            </p>
          </div>
          <EscortFilters />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {escorts.length === 0 ? (
            <div className="col-span-full text-center py-24 px-6">
              <p className="text-[var(--color-silver)] font-light text-lg mb-4">
                No companions match your criteria yet.
              </p>
              <p className="text-[var(--color-muted)] font-light text-sm">
                <Link
                  href="/register"
                  className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition underline underline-offset-4"
                >
                  Apply to join
                </Link>{" "}
                as a companion
              </p>
            </div>
          ) : (
            escorts.map((e) => (
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
            ))
          )}
        </div>

        <div className="mt-10 text-sm text-[var(--color-silver)] font-light">
          <p>
            Need inspiration for your next arrangement?{" "}
            <Link
              href="/gallery"
              className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] underline underline-offset-4"
            >
              Visit our image gallery
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
