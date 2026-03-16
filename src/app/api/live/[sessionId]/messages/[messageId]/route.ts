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

/** DELETE: Hide/delete a live chat message. Companion (broadcaster) only. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; messageId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, messageId } = await params;
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { userId: true } } },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (payload.role !== "escort" || session.escort.userId !== payload.userId) {
    return NextResponse.json({ error: "Only the broadcaster can delete messages" }, { status: 403 });
  }

  const msg = await prisma.liveSessionMessage.findFirst({
    where: { id: messageId, liveSessionId: sessionId },
  });
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (msg.deletedAt) return NextResponse.json({ ok: true }); // already hidden

  await prisma.liveSessionMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
