import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/bookings/[id]/block
 * Block the other party in this connection (booking). Resolves the other user id server-side.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(req, { keyPrefix: "booking:block", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { escort: true, client: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }
  if (booking.status !== "accepted" && booking.status !== "cancelled") {
    return NextResponse.json({ error: "Cannot block for this connection" }, { status: 400 });
  }

  const isClient = booking.clientId === payload.userId;
  const isEscort = booking.escort?.userId === payload.userId;
  if (!isClient && !isEscort) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const otherUserId = isClient ? booking.escort!.userId : booking.clientId;
  if (otherUserId === payload.userId) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  try {
    await prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: payload.userId,
          blockedId: otherUserId,
        },
      },
      update: {},
      create: {
        blockerId: payload.userId,
        blockedId: otherUserId,
      },
    });
  } catch (e) {
    console.error("[bookings:block] error", e);
    const { apiError } = await import("@/lib/apiError");
    return apiError("Failed to block user", 500);
  }

  return NextResponse.json({ ok: true });
}
