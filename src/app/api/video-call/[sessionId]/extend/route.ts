import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
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

/** POST: Client extends the video call (1 credit = +2 min). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Only client can extend" }, { status: 403 });

  const { sessionId } = await params;
  const session = await prisma.videoCallSession.findUnique({
    where: { id: sessionId },
    select: { id: true, clientId: true, escortId: true, expiresAt: true, status: true },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.clientId !== payload.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.status !== "active") return NextResponse.json({ error: "Call has ended" }, { status: 410 });

  const now = new Date();
  const from = now > session.expiresAt ? now : session.expiresAt;
  const newExpiresAt = new Date(from.getTime() + VIDEO_CALL_BLOCK_MINUTES * 60 * 1000);

  const client = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { credits: true },
  });
  if (!client || (client.credits ?? 0) < VIDEO_CALL_CREDITS_PER_BLOCK) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "NEED_CREDITS", required: VIDEO_CALL_CREDITS_PER_BLOCK },
      { status: 402 }
    );
  }

  await prisma.$transaction([
    prisma.videoCallSession.update({
      where: { id: sessionId },
      data: { expiresAt: newExpiresAt },
    }),
    prisma.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: VIDEO_CALL_CREDITS_PER_BLOCK } },
    }),
  ]);

  await recordVideoCallAndEarn({
    clientUserId: payload.userId,
    escortId: session.escortId,
    amount: VIDEO_CALL_CREDITS_PER_BLOCK,
    videoCallSessionId: session.id,
    type: "video_call_extend",
  });

  return NextResponse.json({ expiresAt: newExpiresAt });
}
