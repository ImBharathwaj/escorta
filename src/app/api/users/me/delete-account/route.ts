import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePhotoByStoredUrl } from "@/lib/minio";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "users:delete-account", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;
  if (payload.role !== "client" && payload.role !== "escort") {
    return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, phone: true, role: true, deletedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.deletedAt) {
    return NextResponse.json({ error: "Account already deleted" }, { status: 400 });
  }

  // For escorts, remove their photos from storage and DB, and deactivate the profile.
  if (user.role === "escort") {
    const escort = await prisma.escortProfile.findUnique({
      where: { userId: user.id },
      include: { photos: true },
    });

    const photos = escort?.photos ?? [];
    for (const p of photos) {
      try {
        await deletePhotoByStoredUrl(p.imageUrl);
      } catch (e) {
        console.error("[delete-account] failed deleting photo from storage", e);
      }
    }

    await prisma.$transaction(async (tx) => {
      if (escort) {
        await tx.escortPhoto.deleteMany({ where: { escortId: escort.id } });
        await tx.escortProfile.update({
          where: { id: escort.id },
          data: {
            isActive: false,
            description: null,
            city: null,
            country: null,
            age: null,
          },
        });
      }
      await tx.deletedUserEmail.create({
        data: {
          email: user.email ?? null,
          phone: user.phone ?? null,
          role: user.role,
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          email: null,
          phone: null,
          displayName: null,
          avatarUrl: null,
          passwordHash: "",
        },
      });
    });

    return NextResponse.json({ ok: true, message: "Account deleted" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.deletedUserEmail.create({
      data: {
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: null,
        phone: null,
        displayName: null,
        avatarUrl: null,
        passwordHash: "",
      },
    });
  });

  return NextResponse.json({ ok: true, message: "Account deleted" });
}
