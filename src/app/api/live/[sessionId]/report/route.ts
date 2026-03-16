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

/** POST: Report this live session (client or participant). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { userId: true } } },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Reporter must be the companion (broadcaster) or a viewer
  const isCompanion = payload.role === "escort" && session.escort.userId === payload.userId;
  let isViewer = false;
  if (payload.role === "client") {
    const viewer = await prisma.liveSessionViewer.findUnique({
      where: { liveSessionId_clientId: { liveSessionId: sessionId, clientId: payload.userId } },
    });
    isViewer = !!viewer;
  }
  if (!isCompanion && !isViewer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;

  // Idempotent: one report per user per session
  const existing = await prisma.sessionReport.findFirst({
    where: {
      reporterId: payload.userId,
      reportType: "live_session",
      referenceId: sessionId,
    },
  });

  if (existing) {
    await prisma.sessionReport.update({
      where: { id: existing.id },
      data: { reason: reason ?? undefined },
    });
  } else {
    await prisma.sessionReport.create({
      data: {
        reporterId: payload.userId,
        reportType: "live_session",
        referenceId: sessionId,
        reason: reason ?? undefined,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
