import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";
import { CONNECT_CREDITS } from "@/lib/credits";
import { recordCreditTransaction } from "@/lib/creditLedger";

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

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role === "escort") {
    const profile = await prisma.escortProfile.findUnique({
      where: { userId: payload.userId },
    });
    if (!profile) {
      return NextResponse.json({ bookings: [] });
    }
    const bookings = await prisma.booking.findMany({
      where: { escortId: profile.id },
      include: { client: { select: { id: true, email: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    const withAvatars = await Promise.all(
      bookings.map(async (b) => ({
        ...b,
        client: b.client
          ? {
              ...b.client,
              avatarSignedUrl: b.client.avatarUrl
                ? await getSignedImageUrl(b.client.avatarUrl).catch(() => null)
                : null,
            }
          : undefined,
      }))
    );
    return NextResponse.json({ bookings: withAvatars });
  }

  if (payload.role === "client") {
    const bookings = await prisma.booking.findMany({
      where: { clientId: payload.userId },
      include: {
        escort: {
          include: { photos: { orderBy: [{ isPrimary: "desc" }], take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const shaped = bookings.map((b) => ({
      ...b,
      escort: b.escort
        ? {
            id: b.escort.id,
            aliasName: b.escort.aliasName,
            primaryPhotoId: b.escort.photos?.[0]?.id ?? null,
          }
        : undefined,
    }));
    return NextResponse.json(
      { bookings: shaped },
      { headers: { "Cache-Control": "private, no-store, must-revalidate" } }
    );
  }

  return NextResponse.json({ bookings: [] });
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "client") {
    return NextResponse.json({ error: "Only clients can create bookings" }, { status: 403 });
  }

  const { escort_id, message } = await req.json();

  if (!escort_id) {
    return NextResponse.json(
      { error: "escort_id required" },
      { status: 400 }
    );
  }

  const escort = await prisma.escortProfile.findFirst({
    where: { id: escort_id, isActive: true },
  });
  if (!escort) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  const existing = await prisma.booking.findFirst({
    where: {
      escortId: escort_id,
      clientId: payload.userId,
      status: { in: ["pending", "accepted"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "accepted" ? "Already connected" : "Connection request already sent" },
      { status: 400 }
    );
  }
  // Cancelled bookings are ignored above; client can send a new request after being disconnected

  const client = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { credits: true },
  });
  const credits = client?.credits ?? 0;
  if (credits < CONNECT_CREDITS) {
    return NextResponse.json(
      { error: `Insufficient credits. You need ${CONNECT_CREDITS} credits to connect. You have ${credits}.` },
      { status: 402 }
    );
  }

  const cancelledBooking = await prisma.booking.findFirst({
    where: {
      escortId: escort_id,
      clientId: payload.userId,
      status: "cancelled",
    },
    orderBy: { createdAt: "desc" },
  });

  const booking = await prisma.$transaction(async (tx) => {
    if (cancelledBooking) {
      const updated = await tx.booking.update({
        where: { id: cancelledBooking.id },
        data: {
          status: "pending",
          message: message || null,
        },
      });
      if (message && message.trim()) {
        await tx.message.create({
          data: {
            bookingId: cancelledBooking.id,
            senderId: payload.userId,
            message: message.trim().slice(0, 2000),
          },
        });
      }
      await tx.user.update({
        where: { id: payload.userId },
        data: { credits: { decrement: CONNECT_CREDITS } },
      });
      return updated;
    }

    const b = await tx.booking.create({
      data: {
        escortId: escort_id,
        clientId: payload.userId,
        message: message || null,
        status: "pending",
      },
    });
    if (message && message.trim()) {
      await tx.message.create({
        data: {
          bookingId: b.id,
          senderId: payload.userId,
          message: message.trim().slice(0, 2000),
        },
      });
    }
    await tx.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: CONNECT_CREDITS } },
    });
    return b;
  });

  const escortProfile = await prisma.escortProfile.findUnique({
    where: { id: booking.escortId },
    select: { userId: true },
  });
  await recordCreditTransaction({
    userId: payload.userId,
    amount: -CONNECT_CREDITS,
    type: "connect",
    referenceType: "booking",
    referenceId: booking.id,
    relatedUserId: escortProfile?.userId ?? undefined,
  });
  if (escortProfile?.userId) {
    await recordCreditTransaction({
      userId: escortProfile.userId,
      amount: CONNECT_CREDITS,
      type: "connect_earned",
      referenceType: "booking",
      referenceId: booking.id,
      relatedUserId: payload.userId,
    });
  }

  return NextResponse.json(booking);
}
