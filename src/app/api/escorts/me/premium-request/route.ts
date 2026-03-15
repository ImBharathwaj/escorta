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

/** GET: Companion's premium request status (latest request). */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    select: { id: true, isPremium: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (profile.isPremium) {
    return NextResponse.json({ isPremium: true, request: null });
  }

  const request = await prisma.escortPremiumRequest.findFirst({
    where: { escortId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    isPremium: false,
    request: request
      ? {
          id: request.id,
          status: request.status,
          message: request.message,
          adminNotes: request.adminNotes,
          createdAt: request.createdAt,
          reviewedAt: request.reviewedAt,
        }
      : null,
  });
}

/** POST: Companion submits a request to become premium. One pending per escort at a time. */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Companions only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    select: { id: true, isPremium: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (profile.isPremium) return NextResponse.json({ error: "Already premium" }, { status: 400 });

  const existing = await prisma.escortPremiumRequest.findFirst({
    where: { escortId: profile.id, status: "pending" },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a pending request", requestId: existing.id }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null;

  const request = await prisma.escortPremiumRequest.create({
    data: { escortId: profile.id, status: "pending", message: message || undefined },
  });
  return NextResponse.json({
    request: {
      id: request.id,
      status: request.status,
      message: request.message,
      createdAt: request.createdAt,
    },
  });
}
