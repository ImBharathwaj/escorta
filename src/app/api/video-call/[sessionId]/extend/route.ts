import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VIDEO_CALL_CREDITS_PER_BLOCK, VIDEO_CALL_BLOCK_MINUTES } from "@/lib/credits";
import { recordVideoCallAndEarn } from "@/lib/creditLedger";
import { requireClient } from "@/lib/auth";
import { requireVideoCallAccess } from "@/lib/authorization";

/** POST: Client extends the video call (1 credit = +2 min). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireClient(req);
  if (payload instanceof NextResponse) return payload;

  const { sessionId } = await params;
  const allowed = await requireVideoCallAccess(payload, sessionId);
  if (allowed instanceof NextResponse) return allowed;
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

  return NextResponse.json({ expiresAt: newExpiresAt, serverNow: new Date().toISOString() });
}
