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
        client: { select: { id: true, email: true, displayName: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, message: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const sorted = bookings
      .map((b) => ({
        id: b.id,
        otherName: (b.client?.displayName || b.client?.email) || "Member",
        otherId: b.client?.id,
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
    return NextResponse.json({ connections });
  }

  if (payload.role === "client") {
    const bookings = await prisma.booking.findMany({
      where: { clientId: payload.userId, status: "accepted" },
      include: {
        escort: { select: { id: true, aliasName: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, message: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const sorted = bookings
      .map((b) => ({
        id: b.id,
        otherName: b.escort?.aliasName ?? "Companion",
        otherId: b.escort?.id,
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
    return NextResponse.json({ connections });
  }

  return NextResponse.json({ connections: [] });
}
