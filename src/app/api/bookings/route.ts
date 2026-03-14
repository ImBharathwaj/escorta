import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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
      include: { client: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  }

  if (payload.role === "client") {
    const bookings = await prisma.booking.findMany({
      where: { clientId: payload.userId },
      include: { escort: { select: { id: true, aliasName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
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

  const booking = await prisma.booking.create({
    data: {
      escortId: escort_id,
      clientId: payload.userId,
      message: message || null,
      status: "pending",
    },
  });

  if (message && message.trim()) {
    await prisma.message.create({
      data: {
        bookingId: booking.id,
        senderId: payload.userId,
        message: message.trim().slice(0, 2000),
      },
    });
  }

  return NextResponse.json(booking);
}
