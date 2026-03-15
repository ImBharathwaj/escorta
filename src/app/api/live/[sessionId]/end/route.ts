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

/** PATCH: Companion ends the live session. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

  const { sessionId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { userId: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.escort.userId !== payload.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.status !== "live") return NextResponse.json({ error: "Session already ended" }, { status: 400 });

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: "ended", endedAt: new Date() },
  });

  return NextResponse.json({ ended: true });
}
