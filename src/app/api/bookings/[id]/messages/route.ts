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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await canAccessBooking(id, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: id },
    include: { sender: { select: { id: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    { messages },
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
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const booking = await canAccessBooking(id, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
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
    include: { sender: { select: { id: true, role: true } } },
  });

  return NextResponse.json(msg);
}
