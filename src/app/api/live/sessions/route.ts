import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 5;

/** GET: List active live sessions for "Live now" page. */
export async function GET(req: NextRequest) {
  const sessions = await prisma.liveSession.findMany({
    where: { status: "live" },
    orderBy: { startedAt: "desc" },
    include: {
      escort: { select: { id: true, aliasName: true, photos: { where: { isPrimary: true }, take: 1, select: { id: true } } } },
      viewers: { where: { leftAt: null }, select: { id: true } },
    },
  });

  const list = sessions.map((s) => ({
    id: s.id,
    roomName: s.roomName,
    startedAt: s.startedAt,
    escort: {
      id: s.escort.id,
      aliasName: s.escort.aliasName,
      primaryPhotoId: s.escort.photos[0]?.id ?? null,
    },
    viewerCount: s.viewers.length,
  }));

  return NextResponse.json(
    { sessions: list },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
      },
    }
  );
}
