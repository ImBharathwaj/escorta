import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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

/** GET: Lightweight status check for a video call session (active vs ended/expired). */
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
      { status: "expired", expiresAt: session.expiresAt },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      status: "active",
      expiresAt: session.expiresAt,
    },
    { status: 200 }
  );
}

