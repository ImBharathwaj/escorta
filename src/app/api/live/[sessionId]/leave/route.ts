import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

/** POST: Client leaves the live session (sets leftAt on viewer record). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  await prisma.liveSessionViewer.updateMany({
    where: { liveSessionId: sessionId, clientId: payload.userId, leftAt: null },
    data: { leftAt: new Date() },
  });

  return NextResponse.json({ left: true });
}
