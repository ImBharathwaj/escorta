import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/auth";

/** GET: Lightweight status check for a video call session (active vs ended/expired). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const limited = rateLimit(req, { keyPrefix: "video_call:status", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const { sessionId } = await params;
  const session = await prisma.videoCallSession.findUnique({
    where: { id: sessionId },
    include: {
      escort: { select: { userId: true } },
    },
  });
  if (!session) {
    return NextResponse.json({ status: "ended", reason: "not_found" }, { status: 200 });
  }

  const isClient = session.clientId === payload.userId;
  const isEscort = session.escort.userId === payload.userId;
  if (!isClient && !isEscort) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  if (session.status !== "active") {
    return NextResponse.json({ status: "ended", reason: "ended" }, { status: 200 });
  }
  if (now > session.expiresAt) {
    return NextResponse.json(
      { status: "expired", expiresAt: session.expiresAt, serverNow: now.toISOString() },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      status: "active",
      expiresAt: session.expiresAt,
      serverNow: now.toISOString(),
    },
    { status: 200 }
  );
}

