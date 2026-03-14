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

/** GET: for clients only. Returns all escorts with online status and client's bookingId if connected. */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "client") {
    return NextResponse.json({ error: "For clients only" }, { status: 403 });
  }

  const now = Date.now();
  const escorts = await prisma.escortProfile.findMany({
    where: { isActive: true },
    include: {
      user: { select: { lastActiveAt: true } },
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const clientBookings = await prisma.booking.findMany({
    where: { clientId: payload.userId, status: { in: ["accepted", "pending", "cancelled"] } },
    select: { id: true, escortId: true, status: true },
  });
  const bookingByEscortId = new Map<string | null, { id: string; status: string }>();
  for (const b of clientBookings) {
    if (b.escortId && !bookingByEscortId.has(b.escortId)) {
      bookingByEscortId.set(b.escortId, { id: b.id, status: b.status });
    }
  }

  const list = await Promise.all(
    escorts.map(async (e) => {
      const lastActiveAt = e.user?.lastActiveAt?.getTime();
      const online = !!lastActiveAt && now - lastActiveAt < ONLINE_WINDOW_MS;
      const booking = e.id ? bookingByEscortId.get(e.id) : undefined;
      let primaryPhotoUrl: string | null = null;
      if (e.photos[0]?.imageUrl) {
        try {
          primaryPhotoUrl = await getSignedImageUrl(e.photos[0].imageUrl);
        } catch {
          // keep null
        }
      }
      return {
        id: e.id,
        escortProfileId: e.id,
        aliasName: e.aliasName,
        primaryPhotoId: e.photos[0]?.id ?? null,
        primaryPhotoUrl,
        online,
        bookingId: booking?.id ?? null,
        canSend: booking?.status === "accepted",
      };
    })
  );

  return NextResponse.json(
    { escorts: list },
    { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
  );
}
