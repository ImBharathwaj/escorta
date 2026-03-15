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

/** POST: Client starts a 1-1 video call with a connected escort. Body: { escortId }. */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Only clients can start a video call" }, { status: 403 });

  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Video call not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const escortId = typeof body.escortId === "string" ? body.escortId.trim() : null;
  if (!escortId) return NextResponse.json({ error: "escortId required" }, { status: 400 });

  const accepted = await prisma.booking.findFirst({
    where: {
      clientId: payload.userId,
      escortId,
      status: "accepted",
    },
  });
  if (!accepted) {
    return NextResponse.json({ error: "You must be connected with this companion to start a video call" }, { status: 403 });
  }

  const existing = await prisma.videoCallSession.findFirst({
    where: { clientId: payload.userId, escortId, status: "active" },
  });
  if (existing && new Date() < existing.expiresAt) {
    const client = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { displayName: true },
    });
    const tok = await createLiveKitToken({
      roomName: existing.roomName,
      participantIdentity: `client-${payload.userId}`,
      participantName: client?.displayName || "Client",
      canPublish: true,
      canSubscribe: true,
    });
    if (!tok) return NextResponse.json({ error: "Failed to create token" }, { status: 503 });
    return NextResponse.json({
      session: { id: existing.id, roomName: existing.roomName, expiresAt: existing.expiresAt },
      token: tok.token,
      url: tok.url,
    });
  }

  return NextResponse.json(
    { error: "Request a video call first; the companion must accept before credits are used.", code: "REQUEST_REQUIRED" },
    { status: 400 }
  );
}
