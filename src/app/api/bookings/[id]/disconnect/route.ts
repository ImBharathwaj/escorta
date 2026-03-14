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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "escort") {
    return NextResponse.json(
      { error: "Only companions can disconnect" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: "Companion profile not found" }, { status: 404 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id, escortId: profile.id, status: "accepted" },
    select: { id: true, clientId: true },
  });
  if (!booking) {
    return NextResponse.json(
      { error: "Connection not found or already disconnected" },
      { status: 404 }
    );
  }

  await prisma.booking.updateMany({
    where: {
      escortId: profile.id,
      clientId: booking.clientId,
      status: "accepted",
    },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ ok: true, status: "cancelled" });
}
