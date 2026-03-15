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

/** GET: Session details + LiveKit token for the current user (so they can join the room). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const session = await prisma.videoCallSession.findUnique({
    where: { id: sessionId },
    include: {
      client: { select: { id: true, displayName: true } },
      escort: { select: { id: true, userId: true, aliasName: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active") return NextResponse.json({ error: "Call has ended" }, { status: 410 });
  if (new Date() > session.expiresAt) return NextResponse.json({ error: "Call time expired" }, { status: 410 });

  const isClient = session.clientId === payload.userId;
  const isEscort = session.escort.userId === payload.userId;
  if (!isClient && !isEscort) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Video call not configured" }, { status: 503 });
  }

  const identity = isClient ? `client-${payload.userId}` : `escort-${session.escort.id}`;
  const name = isClient ? (session.client.displayName || "Client") : session.escort.aliasName;
  const tok = await createLiveKitToken({
    roomName: session.roomName,
    participantIdentity: identity,
    participantName: name,
    canPublish: true,
    canSubscribe: true,
  });
  if (!tok) return NextResponse.json({ error: "Failed to create token" }, { status: 503 });

  const other = isClient
    ? { id: session.escort.id, name: session.escort.aliasName }
    : { id: session.client.id, name: session.client.displayName || "Client" };

  return NextResponse.json({
    session: {
      id: session.id,
      roomName: session.roomName,
      expiresAt: session.expiresAt,
      startedAt: session.startedAt,
      other,
    },
    token: tok.token,
    url: tok.url,
  });
}
