import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/auth";
import { encryptOptional } from "@/lib/fieldEncryption";

/** POST: Report this live session (client or participant). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireAnyRole(req, ["client", "escort", "admin"]);
  if (payload instanceof NextResponse) return payload;

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
  const isAdmin = payload.role === "admin";
  if (!isCompanion && !isViewer && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reasonRaw = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
  const reason = reasonRaw ? encryptOptional(reasonRaw) : null;

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
