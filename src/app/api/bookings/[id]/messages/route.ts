import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESSAGE_CREDITS } from "@/lib/credits";
import { recordCreditTransaction } from "@/lib/creditLedger";
import { requireAuth } from "@/lib/auth";

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

/** Allows read-only access for accepted or cancelled (disconnected) bookings so message history persists. */
async function canViewBooking(bookingId: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { escort: true, client: true },
  });
  if (!booking) return null;
  if (booking.status !== "accepted" && booking.status !== "cancelled") return null;
  if (role === "client" && booking.clientId === userId) return booking;
  if (role === "escort" && booking.escort.userId === userId) return booking;
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const { id } = await params;
  const booking = await canViewBooking(id, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: id, deletedAt: null },
    include: { sender: { select: { id: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const canSend = booking.status === "accepted";

  return NextResponse.json(
    { messages, canSend, currentUserId: payload.userId },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const { id } = await params;
  const booking = await canAccessBooking(id, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Block checks: prevent messages if either side has blocked the other.
  const otherUserId = payload.role === "client" ? booking.escort.userId : booking.clientId;
  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: payload.userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: payload.userId },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "Messaging is disabled between you and this user." }, { status: 403 });
  }

  if (payload.role === "client") {
    const clientUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { credits: true },
    });
    const credits = clientUser?.credits ?? 0;
    if (credits < MESSAGE_CREDITS) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${MESSAGE_CREDITS} credit per message. You have ${credits}.` },
        { status: 402 }
      );
    }
  }

  const { message } = await req.json();
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const msg = await prisma.message.create({
    data: {
      bookingId: id,
      senderId: payload.userId,
      message: message.trim().slice(0, 2000),
    },
    include: { sender: { select: { id: true, role: true, displayName: true } } },
  });

  const recipientId = payload.role === "client" ? booking.escort.userId : booking.clientId;
  const senderLabel =
    payload.role === "client"
      ? (booking.client?.displayName || "A client")
      : (booking.escort?.aliasName || "Companion");
  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: "chat_message",
      title: `New message from ${senderLabel}`,
      referenceType: "booking",
      referenceId: id,
      relatedUserId: payload.userId,
    },
  });

  if (payload.role === "client") {
    await prisma.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: MESSAGE_CREDITS } },
    });
    await recordCreditTransaction({
      userId: payload.userId,
      amount: -MESSAGE_CREDITS,
      type: "message",
      referenceType: "booking",
      referenceId: id,
      relatedUserId: booking.escort.userId,
    });
  }

  return NextResponse.json(msg);
}
