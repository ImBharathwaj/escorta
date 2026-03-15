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

async function canAccessSession(sessionId: string, userId: string, role: string): Promise<boolean> {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { escort: { select: { userId: true } } },
  });
  if (!session) return false;
  if (role === "escort" && session.escort.userId === userId) return true;
  if (role === "client") {
    const viewer = await prisma.liveSessionViewer.findUnique({
      where: { liveSessionId_clientId: { liveSessionId: sessionId, clientId: userId } },
    });
    return !!viewer;
  }
  return false;
}

/** GET: List messages for this live session. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const allowed = await canAccessSession(sessionId, payload.userId, payload.role);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.liveSessionMessage.findMany({
    where: { liveSessionId: sessionId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, displayName: true, escortProfile: { select: { aliasName: true } } } } },
  });

  const list = messages.map((m) => ({
    id: m.id,
    message: m.message,
    createdAt: m.createdAt,
    sender: {
      id: m.sender.id,
      name: m.sender.escortProfile?.aliasName ?? m.sender.displayName ?? "User",
    },
  }));

  return NextResponse.json({ messages: list });
}

/** POST: Send a message (client or companion in this session). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const allowed = await canAccessSession(sessionId, payload.userId, payload.role);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "live") {
    return NextResponse.json({ error: "Session not found or ended" }, { status: 410 });
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const msg = await prisma.liveSessionMessage.create({
    data: { liveSessionId: sessionId, senderId: payload.userId, message },
    include: { sender: { select: { id: true, displayName: true, escortProfile: { select: { aliasName: true } } } } },
  });

  return NextResponse.json({
    id: msg.id,
    message: msg.message,
    createdAt: msg.createdAt,
    sender: {
      id: msg.sender.id,
      name: msg.sender.escortProfile?.aliasName ?? msg.sender.displayName ?? "User",
    },
  });
}
