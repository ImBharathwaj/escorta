import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLiveKitToken, isLiveKitConfigured } from "@/lib/livekit";
import { requireAuth } from "@/lib/auth";
import { requireVideoCallAccess } from "@/lib/authorization";

/** GET: Session details + LiveKit token for the current user (so they can join the room). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const { sessionId } = await params;
  const allowed = await requireVideoCallAccess(payload, sessionId);
  if (allowed instanceof NextResponse) return allowed;
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
