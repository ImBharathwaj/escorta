import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { deletePhotoByStoredUrl } from "@/lib/minio";

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

async function getEscortAndPhoto(escortId: string, photoId: string) {
  const escort = await prisma.escortProfile.findUnique({
    where: { id: escortId },
    select: { id: true, userId: true },
  });
  if (!escort) return { escort: null, photo: null };
  const photo = await prisma.escortPhoto.findFirst({
    where: { id: photoId, escortId },
  });
  return { escort, photo };
}

/**
 * Update photo settings.
 *
 * - If called with JSON body `{ allow_gallery: boolean }`, toggles whether this photo
 *   can be used in public galleries/SEO.
 * - Otherwise (legacy call with no JSON body), sets this photo as primary.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: escortId, photoId } = await params;
  const { escort, photo } = await getEscortAndPhoto(escortId, photoId);

  if (!escort || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (escort.userId !== payload.userId && payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.startsWith("application/json")) {
    const body = await req.json().catch(() => ({} as any));
    const hasAllowGallery = Object.prototype.hasOwnProperty.call(body, "allow_gallery");

    if (!hasAllowGallery) {
      return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
    }

    const updated = await prisma.escortPhoto.update({
      where: { id: photoId },
      data: {
        allowGallery: !!body.allow_gallery,
      },
    });

    return NextResponse.json(updated);
  }

  // Legacy behaviour: set as primary image
  await prisma.$transaction([
    prisma.escortPhoto.updateMany({
      where: { escortId },
      data: { isPrimary: false },
    }),
    prisma.escortPhoto.update({
      where: { id: photoId },
      data: { isPrimary: true },
    }),
  ]);

  const updated = await prisma.escortPhoto.findUnique({
    where: { id: photoId },
  });
  return NextResponse.json(updated);
}

/** Delete this photo (DB + MinIO). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: escortId, photoId } = await params;
  const { escort, photo } = await getEscortAndPhoto(escortId, photoId);

  if (!escort || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (escort.userId !== payload.userId && payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deletePhotoByStoredUrl(photo.imageUrl);
  } catch (err) {
    console.error("MinIO delete photo failed:", err);
    // Continue to remove DB record even if MinIO fails
  }

  await prisma.escortPhoto.delete({ where: { id: photoId } });

  const wasPrimary = photo.isPrimary;
  if (wasPrimary) {
    const next = await prisma.escortPhoto.findFirst({
      where: { escortId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.escortPhoto.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  return NextResponse.json({ deleted: true });
}
