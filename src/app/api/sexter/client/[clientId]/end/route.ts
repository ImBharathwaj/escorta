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

/** POST: Escort only. End active sexter session. Only sets endedAt; chat is retained for SEXTER_RETENTION_DAYS and not visible to user. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") return NextResponse.json({ error: "Escorts only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { clientId } = await params;
  const session = await prisma.sexterSession.findFirst({
    where: { clientId, escortId: profile.id, endedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json({ sessionEnded: true, message: "No active session." });
  }

  await prisma.sexterSession.update({
    where: { id: session.id },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({ sessionEnded: true });
}
