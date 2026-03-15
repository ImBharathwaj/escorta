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

/** POST: Client cancels their pending video call request. No credits are used. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Only the requesting client can cancel" }, { status: 403 });

  const { requestId } = await params;
  const videoRequest = await prisma.videoCallRequest.findUnique({
    where: { id: requestId },
  });

  if (!videoRequest) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (videoRequest.clientId !== payload.userId) return NextResponse.json({ error: "Not your request" }, { status: 403 });
  if (videoRequest.status !== "pending") return NextResponse.json({ error: "Request already responded to" }, { status: 400 });

  await prisma.videoCallRequest.update({
    where: { id: requestId },
    data: { status: "cancelled", respondedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: "Request cancelled" });
}
