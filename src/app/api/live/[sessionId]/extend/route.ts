import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { LIVE_EXTEND_CREDITS, LIVE_EXTEND_MINUTES } from "@/lib/credits";
import { recordLiveWatchAndEarn } from "@/lib/creditLedger";

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

/** POST: Client extends live watch time by spending credits (e.g. +2 min per 1 credit). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const { sessionId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, escortId: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "live") return NextResponse.json({ error: "Session has ended" }, { status: 410 });

  const viewer = await prisma.liveSessionViewer.findUnique({
    where: { liveSessionId_clientId: { liveSessionId: sessionId, clientId: payload.userId } },
  });
  if (!viewer) return NextResponse.json({ error: "You are not in this session" }, { status: 403 });
  if (viewer.leftAt) return NextResponse.json({ error: "You have left this session" }, { status: 403 });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { credits: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if ((user.credits ?? 0) < LIVE_EXTEND_CREDITS) {
    return NextResponse.json(
      { error: `Insufficient credits. You need ${LIVE_EXTEND_CREDITS} credit to add ${LIVE_EXTEND_MINUTES} more minutes.`, code: "NEED_CREDITS" },
      { status: 402 }
    );
  }

  const now = new Date();
  const currentExpires = viewer.watchExpiresAt ? new Date(viewer.watchExpiresAt) : now;
  const base = currentExpires.getTime() > now.getTime() ? currentExpires : now;
  const newExpiresAt = new Date(base.getTime() + LIVE_EXTEND_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: LIVE_EXTEND_CREDITS } },
    }),
    prisma.liveSessionViewer.update({
      where: { liveSessionId_clientId: { liveSessionId: sessionId, clientId: payload.userId } },
      data: { watchExpiresAt: newExpiresAt },
    }),
  ]);

  await recordLiveWatchAndEarn({
    clientUserId: payload.userId,
    escortId: session.escortId,
    amount: LIVE_EXTEND_CREDITS,
    liveSessionId: session.id,
  });

  return NextResponse.json({ watchExpiresAt: newExpiresAt.toISOString(), serverNow: new Date().toISOString() });
}
