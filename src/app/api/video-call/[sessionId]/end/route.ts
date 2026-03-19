import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { requireVideoCallAccess } from "@/lib/authorization";

async function endVideoCall(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const { sessionId } = await params;
  const allowed = await requireVideoCallAccess(payload, sessionId);
  if (allowed instanceof NextResponse) return allowed;
  const session = await prisma.videoCallSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { userId: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const isClient = session.clientId === payload.userId;
  const isEscort = session.escort.userId === payload.userId;
  if (!isClient && !isEscort) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (session.status !== "active") return NextResponse.json({ error: "Call already ended" }, { status: 400 });

  await prisma.videoCallSession.update({
    where: { id: sessionId },
    data: { status: "ended", endedAt: new Date() },
  });

  return NextResponse.json({ ended: true });
}

export { endVideoCall as PATCH, endVideoCall as POST };
