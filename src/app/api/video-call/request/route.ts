import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { VIDEO_CALL_CREDITS_PER_BLOCK, VIDEO_CALL_REQUEST_EXPIRY_MINUTES } from "@/lib/credits";

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

/** POST: Client requests a 1-1 video call. No credits deducted until companion accepts. */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Only clients can request a video call" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const escortId = typeof body.escortId === "string" ? body.escortId.trim() : null;
  if (!escortId) return NextResponse.json({ error: "escortId required" }, { status: 400 });

  const accepted = await prisma.booking.findFirst({
    where: {
      clientId: payload.userId,
      escortId,
      status: "accepted",
    },
    select: { id: true },
  });
  if (!accepted) {
    return NextResponse.json({ error: "You must be connected with this companion to request a video call" }, { status: 403 });
  }

  const existingActive = await prisma.videoCallSession.findFirst({
    where: { clientId: payload.userId, escortId, status: "active" },
  });
  if (existingActive && new Date() < existingActive.expiresAt) {
    return NextResponse.json({ error: "You already have an active video call with this companion" }, { status: 409 });
  }

  const pendingRequest = await prisma.videoCallRequest.findFirst({
    where: {
      clientId: payload.userId,
      escortId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingRequest) {
    return NextResponse.json({
      requestId: pendingRequest.id,
      expiresAt: pendingRequest.expiresAt,
      message: "You already have a pending request",
    });
  }

  const client = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { credits: true },
  });
  if (!client) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if ((client.credits ?? 0) < VIDEO_CALL_CREDITS_PER_BLOCK) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "NEED_CREDITS", required: VIDEO_CALL_CREDITS_PER_BLOCK },
      { status: 402 }
    );
  }

  const escort = await prisma.escortProfile.findUnique({
    where: { id: escortId },
    select: { userId: true, aliasName: true },
  });
  if (!escort) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

  const expiresAt = new Date(Date.now() + VIDEO_CALL_REQUEST_EXPIRY_MINUTES * 60 * 1000);
  const request = await prisma.videoCallRequest.create({
    data: {
      clientId: payload.userId,
      escortId,
      status: "pending",
      expiresAt,
    },
  });

  await prisma.notification.create({
    data: {
      userId: escort.userId,
      type: "video_call_request",
      title: `Video call request from a client`,
      referenceType: "booking",
      referenceId: accepted.id,
      relatedUserId: payload.userId,
    },
  });

  return NextResponse.json({
    requestId: request.id,
    expiresAt: request.expiresAt,
    message: "Request sent. Credits will be used only when the companion accepts.",
  });
}
