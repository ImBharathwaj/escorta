import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AuthPayload } from "@/lib/auth";

export async function requireBookingAccess(payload: AuthPayload, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, clientId: true, escort: { select: { userId: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isClient = booking.clientId === payload.userId;
  const isEscort = booking.escort.userId === payload.userId;
  const isAdmin = payload.role === "admin";
  if (!isClient && !isEscort && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return booking;
}

export async function requireVideoCallAccess(payload: AuthPayload, sessionId: string) {
  const session = await prisma.videoCallSession.findUnique({
    where: { id: sessionId },
    select: { id: true, clientId: true, escort: { select: { userId: true } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isClient = session.clientId === payload.userId;
  const isEscort = session.escort.userId === payload.userId;
  const isAdmin = payload.role === "admin";
  if (!isClient && !isEscort && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

export async function requireLiveSessionAccess(payload: AuthPayload, liveSessionId: string) {
  const sess = await prisma.liveSession.findUnique({
    where: { id: liveSessionId },
    select: { id: true, escort: { select: { userId: true } } },
  });
  if (!sess) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isEscortOwner = sess.escort.userId === payload.userId;
  const isClient = payload.role === "client";
  const isAdmin = payload.role === "admin";
  if (!isEscortOwner && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return sess;
}

export async function requireEscortOwner(payload: AuthPayload, escortId: string) {
  const escort = await prisma.escortProfile.findUnique({
    where: { id: escortId },
    select: { id: true, userId: true },
  });
  if (!escort) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner = escort.userId === payload.userId;
  const isAdmin = payload.role === "admin";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return escort;
}

