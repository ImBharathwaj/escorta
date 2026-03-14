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

  if (payload.role === "escort") {
    const profile = await prisma.escortProfile.findUnique({
      where: { userId: payload.userId },
    });
    if (!profile) {
      return NextResponse.json({ connections: [] });
    }
    const bookings = await prisma.booking.findMany({
      where: { escortId: profile.id, status: "accepted" },
      include: {
        client: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, message: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const withAvatars = await Promise.all(
      bookings.map(async (b) => ({
        ...b,
        clientAvatarSignedUrl: b.client?.avatarUrl
          ? await getSignedImageUrl(b.client.avatarUrl).catch(() => null)
          : null,
      }))
    );
    const sorted = withAvatars
      .map((b) => ({
        id: b.id,
        otherName: (b.client?.displayName || b.client?.email) || "Member",
        otherId: b.client?.id,
        otherImageUrl: b.clientAvatarSignedUrl ?? null,
        lastMessage: b.messages[0]
          ? {
              id: b.messages[0].id,
              message: b.messages[0].message,
              createdAt: b.messages[0].createdAt,
              fromMe: b.messages[0].senderId === payload.userId,
            }
          : null,
      }))
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ?? "";
        const bTime = b.lastMessage?.createdAt ?? "";
        return bTime > aTime ? 1 : -1;
      });
    const seen = new Set<string>();
    const connections = sorted.filter((c) => {
      const key = c.otherId ?? c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return NextResponse.json(
      { connections },
      { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
    );
  }

  if (payload.role === "client") {
    const bookings = await prisma.booking.findMany({
      where: { clientId: payload.userId, status: { in: ["accepted", "cancelled"] } },
      include: {
        escort: {
          include: { photos: { orderBy: [{ isPrimary: "desc" }], take: 1 } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const sorted = bookings
      .map((b) => ({
        id: b.id,
        otherName: b.escort?.aliasName ?? "Companion",
        otherId: b.escort?.id,
        otherPhotoId: b.escort?.photos?.[0]?.id ?? null,
        canSend: b.status === "accepted",
        lastMessage: b.messages[0]
          ? {
              id: b.messages[0].id,
              message: b.messages[0].message,
              createdAt: b.messages[0].createdAt,
              fromMe: b.messages[0].senderId === payload.userId,
            }
          : null,
      }))
      .sort((a, b) => {
        if (a.canSend !== b.canSend) return a.canSend ? -1 : 1;
        const aTime = a.lastMessage?.createdAt ?? "";
        const bTime = b.lastMessage?.createdAt ?? "";
        return bTime > aTime ? 1 : -1;
      });
    const seen = new Set<string>();
    const connections = sorted.filter((c) => {
      const key = c.otherId ?? c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return NextResponse.json(
      { connections },
      { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
    );
  }

  return NextResponse.json({ connections: [] });
}
