import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedVodUrl } from "@/lib/minio";

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

/** GET: Return a fresh presigned playback URL for a VOD (escort only, own VODs). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

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
