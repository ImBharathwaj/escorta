import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "escort") {
    return NextResponse.json({ error: "Only companions can view member profiles" }, { status: 403 });
  }

  const { id: clientId } = await params;

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: "Companion profile not found" }, { status: 404 });
  }

  const client = await prisma.user.findUnique({
    where: { id: clientId, role: "client" },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const connection = await prisma.booking.findFirst({
    where: {
      clientId,
      escortId: profile.id,
      status: { in: ["pending", "accepted"] },
    },
    select: { id: true, status: true },
  });

  const avatarSignedUrl = client.avatarUrl
    ? await getSignedImageUrl(client.avatarUrl).catch(() => null)
    : null;

  return NextResponse.json({
    id: client.id,
    email: client.email,
    displayName: client.displayName,
    avatarSignedUrl,
    connected: connection?.status === "accepted",
    connectionId: connection?.status === "accepted" ? connection.id : null,
    connectionStatus: connection?.status ?? null,
  });
}
