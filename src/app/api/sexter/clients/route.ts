import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";
import { ONLINE_WINDOW_MS } from "@/lib/credits";

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

/** GET: Escort only. List clients who have (or had) sexter sessions with this escort. No connection required. */
export async function GET(req: NextRequest) {
  try {
    const payload = getUser(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "escort") return NextResponse.json({ error: "Escorts only" }, { status: 403 });

    const profile = await prisma.escortProfile.findUnique({
      where: { userId: payload.userId },
    });
    if (!profile) return NextResponse.json({ clients: [] });

    const sessions = await prisma.sexterSession.findMany({
      where: { escortId: profile.id, clientId: { not: null } },
      include: {
        client: { select: { id: true, displayName: true, email: true, avatarUrl: true, lastActiveAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const byClientId = new Map<string, { id: string; name: string; avatarUrl: string | null; online: boolean }>();
    const now = Date.now();
    for (const s of sessions) {
      if (!s.client) continue;
      if (byClientId.has(s.client.id)) continue;
      const lastActiveAt = s.client.lastActiveAt?.getTime();
      const online = !!lastActiveAt && now - lastActiveAt < ONLINE_WINDOW_MS;
      byClientId.set(s.client.id, {
        id: s.client.id,
        name: s.client.displayName || s.client.email || "Member",
        avatarUrl: s.client.avatarUrl,
        online,
      });
    }

    const list = Array.from(byClientId.values());
    const withSignedAvatars = await Promise.all(
      list.map(async (c) => ({
        ...c,
        avatarUrl: c.avatarUrl ? await getSignedImageUrl(c.avatarUrl).catch(() => null) : null,
      }))
    );

    return NextResponse.json(
      { clients: withSignedAvatars },
      { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
    );
  } catch {
    return NextResponse.json({ clients: [] });
  }
}
