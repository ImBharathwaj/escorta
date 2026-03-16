import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET: Single live session details (for client before join). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      escort: { select: { id: true, aliasName: true, photos: { where: { isPrimary: true }, take: 1, select: { id: true } } } },
      viewers: { where: { leftAt: null }, select: { id: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "live") return NextResponse.json({ error: "Session has ended" }, { status: 410 });

  return NextResponse.json({
    id: session.id,
    roomName: session.roomName,
    startedAt: session.startedAt,
    escort: {
      id: session.escort.id,
      aliasName: session.escort.aliasName,
      primaryPhotoId: session.escort.photos[0]?.id ?? null,
    },
    viewerCount: session.viewers.length,
  });
}
