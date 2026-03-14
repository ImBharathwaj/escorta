import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { deleteSexterSessionMedia } from "@/lib/minio";

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

async function canAccessBooking(bookingId: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { escort: true, client: true },
  });
  if (!booking) return null;
  if (booking.status !== "accepted") return null;
  if (role === "client" && booking.clientId === userId) return booking;
  if (role === "escort" && booking.escort.userId === userId) return booking;
  return null;
}

/** POST: end the active sexter session; delete all sexter messages and their media from storage. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const booking = await canAccessBooking(bookingId, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const session = await prisma.sexterSession.findFirst({
    where: { bookingId, endedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json({ sessionEnded: true, message: "No active session." });
  }

  const sessionId = session.id;
  await deleteSexterSessionMedia(sessionId);

  await prisma.sexterSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  await prisma.sexterMessage.deleteMany({
    where: { sexterSessionId: sessionId },
  });

  return NextResponse.json({ sessionEnded: true });
}
