import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEscort } from "@/lib/auth";
import { requireVideoCallAccess } from "@/lib/authorization";
import { rateLimit } from "@/lib/rateLimit";

/** GET: List recent tips received for this video call session (escort only). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const limited = rateLimit(req, { keyPrefix: "video_call:tips", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const payload = requireEscort(req);
  if (payload instanceof NextResponse) return payload;

  const { sessionId } = await params;
  const allowed = await requireVideoCallAccess(payload, sessionId);
  if (allowed instanceof NextResponse) return allowed;
  const session = await prisma.videoCallSession.findUnique({
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
      referenceType: "video_call",
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
      t.relatedUser?.displayName?.trim() || t.relatedUser?.email || "A client",
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ tips });
}

