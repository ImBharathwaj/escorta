import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEscort } from "@/lib/auth";

/** PATCH: Companion ends the live session. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireEscort(req);
  if (payload instanceof NextResponse) return payload;

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
