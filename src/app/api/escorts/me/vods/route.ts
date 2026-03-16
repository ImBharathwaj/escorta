import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { uploadVod, getSignedVodUrl, VOD_MAX_BYTES } from "@/lib/minio";

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

/** GET: List current escort's VODs (premium only). Returns id, createdAt, playbackUrl (presigned). */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    select: { id: true, isPremium: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (!profile.isPremium) return NextResponse.json({ isPremium: false, vods: [] });

  const vods = await prisma.escortVod.findMany({
    where: { escortId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  const withUrls = await Promise.all(
    vods.map(async (v) => ({
      id: v.id,
      createdAt: v.createdAt,
      playbackUrl: await getSignedVodUrl(v.storageKey),
    }))
  );
  return NextResponse.json({ isPremium: true, vods: withUrls });
}

/** POST: Upload a VOD (premium companions only). Body: multipart form with "file". */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    select: { id: true, isPremium: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (!profile.isPremium) return NextResponse.json({ error: "Only premium companions can upload VODs" }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const contentType = file.type || "video/mp4";
  if (!contentType.startsWith("video/")) return NextResponse.json({ error: "File must be a video" }, { status: 400 });
  if (file.size > VOD_MAX_BYTES) return NextResponse.json({ error: "Video too large (max 50MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const vodId = crypto.randomUUID();
  const ext = contentType.includes("webm") ? "webm" : "mp4";
  const storageKey = `vods/${profile.id}/${vodId}.${ext}`;

  const vod = await prisma.escortVod.create({
    data: { id: vodId, escortId: profile.id, storageKey },
  });
  await uploadVod(profile.id, vodId, buffer, contentType);

  const playbackUrl = await getSignedVodUrl(vod.storageKey);
  return NextResponse.json({ id: vod.id, createdAt: vod.createdAt, playbackUrl });
}
