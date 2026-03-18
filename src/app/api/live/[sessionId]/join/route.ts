import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLiveKitToken, isLiveKitConfigured } from "@/lib/livekit";
import { LIVE_JOIN_CREDITS, LIVE_WATCH_INITIAL_MINUTES } from "@/lib/credits";
import { recordLiveWatchAndEarn } from "@/lib/creditLedger";
import { requireClient } from "@/lib/auth";

/** POST: Client joins a live session (deducts credits, creates viewer, returns LiveKit token to watch). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireClient(req);
  if (payload instanceof NextResponse) return payload;

  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 });
  }

  const { sessionId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { id: true, aliasName: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "live") return NextResponse.json({ error: "Session has ended" }, { status: 410 });

  const client = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { credits: true, displayName: true },
  });
  if (!client) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if ((client.credits ?? 0) < LIVE_JOIN_CREDITS) {
    return NextResponse.json(
      { error: `Insufficient credits. You need ${LIVE_JOIN_CREDITS} credit to join.`, code: "NEED_CREDITS" },
      { status: 402 }
    );
  }

  const existing = await prisma.liveSessionViewer.findUnique({
    where: { liveSessionId_clientId: { liveSessionId: sessionId, clientId: payload.userId } },
  });
  const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;
  const now = new Date();
  const initialExpiresAt = new Date(now.getTime() + LIVE_WATCH_INITIAL_MINUTES * 60 * 1000);

  if (existing && !existing.leftAt) {
    const tok = await createLiveKitToken({
      roomName: session.roomName,
      participantIdentity: `client-${payload.userId}`,
      participantName: client.displayName || "Viewer",
      canPublish: false,
      canSubscribe: true,
    });
    if (!tok) return NextResponse.json({ error: "Failed to create token" }, { status: 503 });
    return NextResponse.json({
      token: tok.token,
      url: liveKitUrl || tok.url,
      session: { id: session.id, roomName: session.roomName },
      watchExpiresAt: existing.watchExpiresAt?.toISOString() ?? initialExpiresAt.toISOString(),
      serverNow: now.toISOString(),
    });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: LIVE_JOIN_CREDITS } },
    }),
    prisma.liveSessionViewer.upsert({
      where: { liveSessionId_clientId: { liveSessionId: sessionId, clientId: payload.userId } },
      create: {
        liveSessionId: sessionId,
        clientId: payload.userId,
        watchExpiresAt: initialExpiresAt,
      },
      update: { leftAt: null, watchExpiresAt: initialExpiresAt },
    }),
  ]);

  await recordLiveWatchAndEarn({
    clientUserId: payload.userId,
    escortId: session.escortId,
    amount: LIVE_JOIN_CREDITS,
    liveSessionId: session.id,
  });

  const tok = await createLiveKitToken({
    roomName: session.roomName,
    participantIdentity: `client-${payload.userId}`,
    participantName: client.displayName || "Viewer",
    canPublish: false,
    canSubscribe: true,
  });
  if (!tok) return NextResponse.json({ error: "Failed to create token" }, { status: 503 });

  return NextResponse.json({
    token: tok.token,
    url: liveKitUrl || tok.url,
    session: { id: session.id, roomName: session.roomName },
    watchExpiresAt: initialExpiresAt.toISOString(),
    serverNow: new Date().toISOString(),
  });
}
