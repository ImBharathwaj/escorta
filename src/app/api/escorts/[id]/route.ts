import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const escort = await prisma.escortProfile.findFirst({
    where: { id, isActive: true },
    include: {
      photos: { where: { isApproved: true }, orderBy: [{ isPrimary: "desc" }] },
      services: { include: { service: true } },
      adultServices: { include: { adultService: true } },
      availability: true,
    },
  });

  if (!escort) {
    return NextResponse.json({ error: "Escort not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...escort,
    alias_name: escort.aliasName,
    price_per_hour: escort.pricePerHour,
    is_verified: escort.isVerified,
    is_active: escort.isActive,
    photos: escort.photos.map((p) => ({
      id: p.id,
      image_url: p.imageUrl,
      is_primary: p.isPrimary,
    })),
    services: escort.services.map((s) => s.service.name),
    adultServices: escort.adultServices.map((s) => s.adultService.name),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const escort = await prisma.escortProfile.findUnique({ where: { id } });

  if (!escort) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }
  if (escort.userId !== payload.userId && payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { alias_name, age, gender, city, country, description, price_per_hour, services, adult_services } = body;

  await prisma.escortProfile.update({
    where: { id },
    data: {
      ...(alias_name !== undefined && { aliasName: alias_name }),
      ...(age !== undefined && { age: age ?? null }),
      ...(gender !== undefined && { gender: gender ?? null }),
      ...(city !== undefined && { city: city ?? null }),
      ...(country !== undefined && { country: country ?? null }),
      ...(description !== undefined && { description: description ?? null }),
      ...(price_per_hour !== undefined && { pricePerHour: price_per_hour ?? null }),
    },
  });

  if (services !== undefined && Array.isArray(services)) {
    await prisma.escortService.deleteMany({ where: { escortId: id } });
    if (services.length > 0) {
      const serviceRecords = await prisma.service.findMany({
        where: { name: { in: services } },
      });
      if (serviceRecords.length > 0) {
        await prisma.escortService.createMany({
          data: serviceRecords.map((s) => ({ escortId: id, serviceId: s.id })),
        });
      }
    }
  }

  if (adult_services !== undefined && Array.isArray(adult_services)) {
    await prisma.escortAdultService.deleteMany({ where: { escortId: id } });
    if (adult_services.length > 0) {
      const names = [...new Set(adult_services)].filter((n) => typeof n === "string" && n.trim());
      const serviceIds: string[] = [];
      for (const name of names) {
        const trimmed = name.trim();
        if (!trimmed) continue;
        const service = await prisma.adultService.upsert({
          where: { name: trimmed },
          update: {},
          create: { name: trimmed },
        });
        serviceIds.push(service.id);
      }
      if (serviceIds.length > 0) {
        await prisma.escortAdultService.createMany({
          data: serviceIds.map((adultServiceId) => ({ escortId: id, adultServiceId })),
          skipDuplicates: true,
        });
      }
    }
  }

  const updated = await prisma.escortProfile.findUnique({
    where: { id },
    include: { photos: true, services: { include: { service: true } }, adultServices: { include: { adultService: true } } },
  });
  return NextResponse.json(updated);
}
