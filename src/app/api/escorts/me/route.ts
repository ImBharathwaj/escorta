import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";

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

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "escort") {
    return NextResponse.json({ error: "Only companions have profiles" }, { status: 403 });
  }

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    include: {
      photos: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      services: { include: { service: true } },
      adultServices: { include: { adultService: true } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "No profile found" }, { status: 404 });
  }

  const photos = profile.photos ?? [];
  const photosWithSignedUrls = await Promise.all(
    photos.map(async (p) => ({
      ...p,
      imageUrl: await getSignedImageUrl(p.imageUrl),
    }))
  );

  return NextResponse.json({
    ...profile,
    photos: photosWithSignedUrls,
    services: profile.services.map((s) => s.service.name),
    adultServices: profile.adultServices.map((s) => s.adultService.name),
  });
}
