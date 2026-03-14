import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConnectForm from "@/components/escort/ConnectForm";
import { ConnectionStatusBadge } from "@/components/escort/ConnectionStatusBadge";
import { EscortDetailPhotos } from "@/components/escort/EscortDetailPhotos";

export const dynamic = "force-dynamic";

export default async function EscortPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const escort = await prisma.escortProfile.findFirst({
    where: { id, isActive: true },
    include: {
      photos: { where: { isApproved: true }, orderBy: [{ isPrimary: "desc" }] },
      services: { include: { service: true } },
      adultServices: { include: { adultService: true } },
    },
  });

  if (!escort) {
    return (
      <div className="pt-24 max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-2xl font-light text-[var(--color-silver)] mb-6">
          Companion not found
        </h1>
        <Link
          href="/companions"
          className="text-sm tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
        >
          ← Return to companions
        </Link>
      </div>
    );
  }

  const photos = escort.photos;
  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0];

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <Link
          href="/companions"
          className="inline-flex items-center gap-2 text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-champagne)] mb-12 transition"
        >
          ← All companions
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <EscortDetailPhotos
              escortId={escort.id}
              primaryPhotoId={primaryPhoto?.id ?? null}
              photos={photos.map((p) => ({ id: p.id }))}
            />

            <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
                <div>
                  <h1 className="text-3xl font-light text-[var(--color-ivory)] flex flex-wrap items-center gap-3 tracking-wide">
                    {escort.aliasName}
                    <ConnectionStatusBadge escortId={escort.id} />
                    {(escort.isVerified || (escort.isGenderVerified && escort.gender === "female")) && (
                      <span className="text-xs tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] px-2 py-1">
                        {escort.isGenderVerified && escort.gender === "female" ? "Verified female" : "Verified"}
                      </span>
                    )}
                  </h1>
                  <p className="text-[var(--color-silver)] font-light mt-2">
                    {escort.age && `${escort.age} years`}
                    {escort.gender && ` · ${escort.gender}`}
                    {escort.city && ` · ${escort.city}`}
                    {escort.country && ` · ${escort.country}`}
                  </p>
                </div>
              </div>

              {escort.description && (
                <p className="text-[var(--color-pearl)] font-light leading-relaxed whitespace-pre-wrap">
                  {escort.description}
                </p>
              )}

              {escort.services.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                  <h3 className="text-xs tracking-[0.2em] uppercase text-[var(--color-silver)] mb-3 font-normal">
                    Meetup types
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {escort.services.map((s) => (
                      <span
                        key={s.service.id}
                        className="px-3 py-1.5 text-sm font-light text-[var(--color-silver)] border border-[var(--color-border)] rounded-sm hover:border-[var(--color-champagne)]/40 transition"
                      >
                        {s.service.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {escort.adultServices.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                  <h3 className="text-xs tracking-[0.2em] uppercase text-[var(--color-silver)] mb-3 font-normal">
                    Services offered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {escort.adultServices.map((s) => (
                      <span
                        key={s.adultService.id}
                        className="px-3 py-1.5 text-sm font-light text-[var(--color-silver)] border border-[var(--color-border)] rounded-sm hover:border-[var(--color-champagne)]/40 transition"
                      >
                        {s.adultService.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:pt-0">
            <ConnectForm escortId={escort.id} escortName={escort.aliasName} />
          </div>
        </div>
      </div>
    </div>
  );
}
