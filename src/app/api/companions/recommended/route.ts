import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/auth";

/**
 * GET: Returns recommended companions for the logged-in client.
 * Based on: preferred city, preferred languages, preferred services,
 * and cities/services of companions the client has previously connected with.
 */
export async function GET(req: NextRequest) {
  const payload = requireClient(req);
  if (payload instanceof NextResponse) return payload;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      preferredCity: true,
      preferredLanguages: true,
      clientPreferredServices: {
        select: { adultService: { select: { name: true } } },
      },
    },
  });

  if (!user) return NextResponse.json({ recommended: [] });

  const prevBookings = await prisma.booking.findMany({
    where: { clientId: payload.userId, status: "accepted" },
    select: { escortId: true },
    take: 20,
  });
  const connectedIds = prevBookings.map((b) => b.escortId);

  const prevEscorts = connectedIds.length > 0
    ? await prisma.escortProfile.findMany({
        where: { id: { in: connectedIds } },
        select: { city: true, services: { select: { service: { select: { name: true } } } } },
      })
    : [];

  const cities = new Set<string>();
  if (user.preferredCity) cities.add(user.preferredCity.toLowerCase());
  prevEscorts.forEach((e) => { if (e.city) cities.add(e.city.toLowerCase()); });

  const serviceNames = new Set<string>();
  user.clientPreferredServices.forEach((s) => serviceNames.add(s.adultService.name.toLowerCase()));
  prevEscorts.forEach((e) => e.services.forEach((s) => serviceNames.add(s.service.name.toLowerCase())));

  const langs = user.preferredLanguages ?? [];

  const conditions: Record<string, unknown>[] = [];
  if (cities.size > 0) {
    const cityArray = [...cities];
    conditions.push(
      ...cityArray.map((c) => ({ city: { contains: c, mode: "insensitive" as const } }))
    );
  }
  if (serviceNames.size > 0) {
    const svcArray = [...serviceNames];
    conditions.push(
      ...svcArray.map((s) => ({
        services: { some: { service: { name: { contains: s, mode: "insensitive" as const } } } },
      }))
    );
  }
  if (langs.length > 0) {
    conditions.push({ languages: { hasSome: langs } });
  }

  if (conditions.length === 0) {
    return NextResponse.json({ recommended: [] });
  }

  const escorts = await prisma.escortProfile.findMany({
    where: {
      isActive: true,
      id: { notIn: connectedIds },
      OR: conditions,
    },
    include: {
      photos: {
        where: { isApproved: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const recommended = escorts.map((e) => ({
    id: e.id,
    aliasName: e.aliasName,
    age: e.age,
    city: e.city,
    gender: e.gender,
    isVerified: e.isVerified,
    isGenderVerified: e.isGenderVerified,
    photoId: e.photos[0]?.id ?? null,
  }));

  return NextResponse.json({ recommended });
}
