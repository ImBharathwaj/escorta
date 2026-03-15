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

/** GET: List video call requests. Escort: pending for me. Client: my pending (optional escortId query). */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const { searchParams } = new URL(req.url);
  const escortId = searchParams.get("escortId");

  if (payload.role === "escort") {
    const profile = await prisma.escortProfile.findUnique({
      where: { userId: payload.userId },
      select: { id: true },
    });
    if (!profile) return NextResponse.json({ requests: [] });

    const requests = await prisma.videoCallRequest.findMany({
      where: {
        escortId: profile.id,
        status: "pending",
        expiresAt: { gt: now },
      },
      include: {
        client: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.displayName || "Client",
        escortId: r.escortId,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      })),
    });
  }

  if (payload.role === "client") {
    const where = {
      clientId: payload.userId,
      status: "pending" as const,
      expiresAt: { gt: now } as const,
      ...(escortId ? { escortId } : {}),
    };
    const withEscort = await prisma.videoCallRequest.findMany({
      where,
      include: { escort: { select: { id: true, aliasName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      requests: withEscort.map((r) => ({
        id: r.id,
        escortId: r.escortId,
        escortName: r.escort.aliasName,
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      })),
    });
  }

  return NextResponse.json({ requests: [] });
}
