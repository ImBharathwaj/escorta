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

/** GET: Return the current user's active video call session (if any). */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const session = await prisma.videoCallSession.findFirst({
    where: {
      status: "active",
      expiresAt: { gt: now },
      OR: [
        { clientId: payload.userId },
        { escort: { userId: payload.userId } },
      ],
    },
    include: {
      client: { select: { id: true, displayName: true } },
      escort: { select: { id: true, aliasName: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  if (!session) {
    return NextResponse.json({ session: null });
  }

  const other = payload.role === "client"
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
  });
}
