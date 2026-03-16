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

/** GET: List recent tips received for this live session (escort only). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") {
    return NextResponse.json({ error: "Only the streamer can view session tips" }, { status: 403 });
  }

  const { sessionId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { userId: true } } },
  });
  if (!session || session.escort.userId !== payload.userId) {
    return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
  }

  const transactions = await prisma.creditTransaction.findMany({
    where: {
      userId: payload.userId,
      type: "tip_earned",
      referenceType: "live_session",
      referenceId: sessionId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      relatedUser: { select: { displayName: true, email: true } },
    },
  });

  const tips = transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    clientName:
      t.relatedUser?.displayName?.trim() || t.relatedUser?.email || "A viewer",
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ tips });
}
