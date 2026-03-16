import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { createLiveKitToken, isLiveKitConfigured } from "@/lib/livekit";
import { VIDEO_CALL_CREDITS_PER_BLOCK, VIDEO_CALL_BLOCK_MINUTES } from "@/lib/credits";
import { recordVideoCallAndEarn } from "@/lib/creditLedger";

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

/** POST: Companion accepts a video call request. Creates session, deducts client credits, returns session + token for companion. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Only companions can accept video call requests" }, { status: 403 });

  if (!isLiveKitConfigured()) {
    return NextResponse.json({ error: "Video call not configured" }, { status: 503 });
  }

  const { requestId } = await params;
  const videoRequest = await prisma.videoCallRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { select: { id: true, credits: true, displayName: true } },
      escort: { select: { id: true, userId: true, aliasName: true } },
    },
  });

  if (!videoRequest) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (videoRequest.escort.userId !== payload.userId) return NextResponse.json({ error: "Not your request" }, { status: 403 });
  if (videoRequest.status !== "pending") return NextResponse.json({ error: "Request already responded to" }, { status: 400 });
  if (new Date() > videoRequest.expiresAt) {
    await prisma.videoCallRequest.update({
      where: { id: requestId },
      data: { status: "expired", respondedAt: new Date() },
    });
    return NextResponse.json({ error: "Request has expired" }, { status: 410 });
  }

  if ((videoRequest.client.credits ?? 0) < VIDEO_CALL_CREDITS_PER_BLOCK) {
    await prisma.videoCallRequest.update({
      where: { id: requestId },
      data: { status: "declined", respondedAt: new Date() },
    });
    return NextResponse.json(
      { error: "Client no longer has enough credits for this call", code: "CLIENT_INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  const expiresAt = new Date(Date.now() + VIDEO_CALL_BLOCK_MINUTES * 60 * 1000);
  const sessionId = crypto.randomUUID();
  const roomName = `video-${sessionId}`;

  await prisma.$transaction([
    prisma.videoCallRequest.update({
      where: { id: requestId },
      data: { status: "accepted", respondedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: videoRequest.clientId },
      data: { credits: { decrement: VIDEO_CALL_CREDITS_PER_BLOCK } },
    }),
    prisma.videoCallSession.create({
      data: {
        id: sessionId,
        clientId: videoRequest.clientId,
        escortId: videoRequest.escortId,
        roomName,
        expiresAt,
        status: "active",
      },
    }),
  ]);

  await recordVideoCallAndEarn({
    clientUserId: videoRequest.clientId,
    escortId: videoRequest.escortId,
    amount: VIDEO_CALL_CREDITS_PER_BLOCK,
    videoCallSessionId: sessionId,
    type: "video_call",
  });

  await prisma.notification.create({
    data: {
      userId: videoRequest.clientId,
      type: "video_call_accepted",
      title: "Your video call was accepted",
      referenceType: "video_call_session",
      referenceId: sessionId,
      relatedUserId: payload.userId,
    },
  });

  const tok = await createLiveKitToken({
    roomName,
    participantIdentity: `escort-${videoRequest.escortId}`,
    participantName: videoRequest.escort.aliasName,
    canPublish: true,
    canSubscribe: true,
  });
  if (!tok) return NextResponse.json({ error: "Failed to create token" }, { status: 503 });

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || tok.url;
  return NextResponse.json({
    session: { id: sessionId, roomName, expiresAt },
    token: tok.token,
    url: livekitUrl,
    message: "Call started. Client will be notified.",
  });
}
