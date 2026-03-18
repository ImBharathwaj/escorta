import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedVodUrl } from "@/lib/minio";
import { requireEscort } from "@/lib/auth";

/** GET: Return a fresh presigned playback URL for a VOD (escort only, own VODs). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireEscort(req);
  if (payload instanceof NextResponse) return payload;

  const { id } = await params;
  const vod = await prisma.escortVod.findUnique({
    where: { id },
    include: { escort: { select: { userId: true } } },
  });
  if (!vod) return NextResponse.json({ error: "VOD not found" }, { status: 404 });
  if (vod.escort.userId !== payload.userId) return NextResponse.json({ error: "Not your VOD" }, { status: 403 });

  const playbackUrl = await getSignedVodUrl(vod.storageKey);
  return NextResponse.json({ playbackUrl });
}
