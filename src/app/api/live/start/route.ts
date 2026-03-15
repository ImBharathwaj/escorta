import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { createLiveKitToken, isLiveKitConfigured } from "@/lib/livekit";

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

/** POST: Companion starts a live session. Creates LiveSession and returns token + url to join as broadcaster. */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 });
  }

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    select: { id: true, userId: true, aliasName: true },
  });
  if (!profile) return NextResponse.json({ error: "Companion profile not found" }, { status: 404 });

  const existing = await prisma.liveSession.findFirst({
    where: { escortId: profile.id, status: "live" },
  });
  if (existing) {
    const tok = await createLiveKitToken({
      roomName: existing.roomName,
      participantIdentity: `escort-${profile.id}`,
      participantName: profile.aliasName,
      canPublish: true,
      canSubscribe: true,
    });
    if (!tok) return NextResponse.json({ error: "Failed to create token" }, { status: 503 });
    return NextResponse.json({
      session: { id: existing.id, roomName: existing.roomName, startedAt: existing.startedAt },
      token: tok.token,
      url: tok.url,
    });
  }

  const roomName = `live-${profile.id}-${Date.now()}`;
  const session = await prisma.liveSession.create({
    data: { escortId: profile.id, roomName, status: "live" },
  });

  const connectedClients = await prisma.booking.findMany({
    where: { escortId: profile.id, status: "accepted" },
    select: { clientId: true },
  });
  if (connectedClients.length > 0) {
    await prisma.notification.createMany({
      data: connectedClients.map(({ clientId }) => ({
        userId: clientId,
        type: "live_started",
        title: `${profile.aliasName} is now live`,
        referenceType: "live_session",
        referenceId: session.id,
        relatedUserId: profile.userId,
      })),
    });
  }

  const tok = await createLiveKitToken({
    roomName: session.roomName,
    participantIdentity: `escort-${profile.id}`,
    participantName: profile.aliasName,
    canPublish: true,
    canSubscribe: true,
  });
  if (!tok) {
    await prisma.liveSession.update({ where: { id: session.id }, data: { status: "ended", endedAt: new Date() } });
    return NextResponse.json({ error: "Failed to create token" }, { status: 503 });
  }

  return NextResponse.json({
    session: { id: session.id, roomName: session.roomName, startedAt: session.startedAt },
    token: tok.token,
    url: tok.url,
  });
}
