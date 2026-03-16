import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      displayName: true,
      avatarUrl: true,
      isPremiumMember: true,
      credits: true,
      orientation: true,
      preferencesNotes: true,
      preferredLanguages: true,
      createdAt: true,
      clientPreferredServices: {
        select: { adultService: { select: { name: true } } },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const avatarSignedUrl = user.avatarUrl
    ? await getSignedImageUrl(user.avatarUrl).catch(() => null)
    : null;
  const { clientPreferredServices, ...rest } = user;
  const preferredServices = (clientPreferredServices ?? []).map(
    (c) => c.adultService.name
  );
  return NextResponse.json({
    ...rest,
    avatarSignedUrl,
    preferredServices,
    preferredLanguages: rest.preferredLanguages ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    display_name,
    email,
    phone,
    orientation,
    preferences_notes,
    preferred_services,
    preferred_languages,
  } = body;

  if (preferred_services !== undefined) {
    const names = Array.isArray(preferred_services)
      ? preferred_services.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
    const serviceIds: string[] = [];
    for (const name of names) {
      const existing = await prisma.adultService.findUnique({
        where: { name },
        select: { id: true },
      });
      if (existing) {
        serviceIds.push(existing.id);
      } else {
        const created = await prisma.adultService.create({
          data: { name },
          select: { id: true },
        });
        serviceIds.push(created.id);
      }
    }
    await prisma.clientAdultService.deleteMany({
      where: { userId: payload.userId },
    });
    if (serviceIds.length > 0) {
      await prisma.clientAdultService.createMany({
        data: serviceIds.map((adultServiceId) => ({
          userId: payload.userId,
          adultServiceId,
        })),
      });
    }
  }

  const languagesArray =
    preferred_languages !== undefined && Array.isArray(preferred_languages)
      ? preferred_languages.map((s: unknown) => String(s).trim()).filter(Boolean)
      : undefined;

  await prisma.user.update({
    where: { id: payload.userId },
    data: {
      ...(display_name !== undefined && { displayName: display_name?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(orientation !== undefined && { orientation: orientation?.trim() || null }),
      ...(preferences_notes !== undefined && {
        preferencesNotes: preferences_notes?.trim() || null,
      }),
      ...(languagesArray !== undefined && { preferredLanguages: languagesArray }),
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      displayName: true,
      avatarUrl: true,
      isPremiumMember: true,
      credits: true,
      orientation: true,
      preferencesNotes: true,
      preferredLanguages: true,
      createdAt: true,
      clientPreferredServices: {
        select: { adultService: { select: { name: true } } },
      },
    },
  });
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const { clientPreferredServices, ...rest } = updated;
  const preferredServices = (clientPreferredServices ?? []).map(
    (c) => c.adultService.name
  );
  const avatarSignedUrl = rest.avatarUrl
    ? await getSignedImageUrl(rest.avatarUrl).catch(() => null)
    : null;
  return NextResponse.json({
    ...rest,
    preferredServices,
    preferredLanguages: rest.preferredLanguages ?? [],
    avatarSignedUrl,
  });
}
