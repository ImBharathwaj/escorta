import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getAuth(req: NextRequest): { userId: string; role?: string } | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role?: string };
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuth(req);
  let canViewFull = false;

  const { id } = await params;

  const photo = await prisma.escortPhoto.findUnique({
    where: { id, isApproved: true },
    select: { imageUrl: true, escortId: true },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (auth?.role === "admin") {
    canViewFull = true;
  }

  let isClientConnectionView = false;
  if (auth?.userId && !canViewFull) {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true, isPremiumMember: true },
    });
    canViewFull =
      !!user &&
      (user.role === "escort" ||
        (user.role === "client" && user.isPremiumMember === true));

    if (!canViewFull && user?.role === "client") {
      const acceptedWithEscort = await prisma.booking.findFirst({
        where: {
          clientId: auth.userId,
          escortId: photo.escortId,
          status: "accepted",
        },
      });
      if (acceptedWithEscort) {
        canViewFull = true;
        isClientConnectionView = true;
      }
    }
  }
  // Only accepted connections get full view; once escort disconnects (status cancelled), client gets blurred

  try {
    const signedUrl = await getSignedImageUrl(photo.imageUrl);
    const imageRes = await fetch(signedUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    if (canViewFull) {
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": isClientConnectionView
            ? "private, no-store, must-revalidate"
            : "private, max-age=3600",
          "X-Image-Full": "true",
        },
      });
    }

    const blurred = await sharp(buffer)
      .resize(200, 200, { fit: "cover" })
      .blur(20)
      .jpeg({ quality: 50 })
      .toBuffer();

    return new NextResponse(new Uint8Array(blurred), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load image" }, { status: 502 });
  }
}
