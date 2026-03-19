import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export const revalidate = 60;

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const minAge = searchParams.get("minAge");
  const maxAge = searchParams.get("maxAge");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const service = searchParams.get("service");
  const language = searchParams.get("language");

  const where: Record<string, unknown> = { isActive: true };

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }
  if (minAge || maxAge) {
    where.age = {};
    if (minAge) (where.age as Record<string, number>).gte = parseInt(minAge);
    if (maxAge) (where.age as Record<string, number>).lte = parseInt(maxAge);
  }
  if (minPrice || maxPrice) {
    where.pricePerHour = {};
    if (minPrice) (where.pricePerHour as Record<string, number>).gte = parseInt(minPrice);
    if (maxPrice) (where.pricePerHour as Record<string, number>).lte = parseInt(maxPrice);
  }
  if (service) {
    where.services = {
      some: {
        service: {
          name: { contains: service, mode: "insensitive" },
        },
      },
    };
  }
  if (language) {
    where.languages = {
      has: language,
    };
  }

  const escorts = await prisma.escortProfile.findMany({
    where,
    include: {
      photos: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = escorts.map((e) => ({
    id: e.id,
    alias_name: e.aliasName,
    age: e.age,
    gender: e.gender,
    is_gender_verified: e.isGenderVerified,
    city: e.city,
    country: e.country,
    description: e.description,
    price_per_hour: e.pricePerHour,
    is_verified: e.isVerified,
    is_active: e.isActive,
    created_at: e.createdAt,
    languages: e.languages ?? [],
    primary_photo: e.photos[0]?.imageUrl ?? null,
  }));

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "escort") {
    return NextResponse.json({ error: "Only escorts can create profiles" }, { status: 403 });
  }

  const body = await req.json();
  const { alias_name, age, gender, city, country, description, price_per_hour, services, adult_services } = body;

  if (!alias_name) {
    return NextResponse.json({ error: "alias_name required" }, { status: 400 });
  }

  const escort = await prisma.escortProfile.create({
    data: {
      userId: payload.userId,
      aliasName: alias_name,
      age: age ?? undefined,
      gender: gender ?? undefined,
      city: city ?? undefined,
      country: country ?? undefined,
      description: description ?? undefined,
      pricePerHour: price_per_hour ?? undefined,
    },
  });

  if (services && Array.isArray(services) && services.length > 0) {
    const serviceRecords = await prisma.service.findMany({
      where: { name: { in: services } },
    });
    if (serviceRecords.length > 0) {
      await prisma.escortService.createMany({
        data: serviceRecords.map((s) => ({ escortId: escort.id, serviceId: s.id })),
        skipDuplicates: true,
      });
    }
  }

  if (adult_services && Array.isArray(adult_services) && adult_services.length > 0) {
    const names = [...new Set(adult_services)]
      .filter((n) => typeof n === "string" && n.trim())
      .map((n: string) => n.trim());
    const services = await Promise.all(
      names.map((name) =>
        prisma.adultService.upsert({ where: { name }, update: {}, create: { name } })
      )
    );
    const serviceIds = services.map((s) => s.id);
    if (serviceIds.length > 0) {
      await prisma.escortAdultService.createMany({
        data: serviceIds.map((adultServiceId) => ({ escortId: escort.id, adultServiceId })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json(escort);
}
