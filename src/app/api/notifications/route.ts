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

/** GET: List notifications for current user (unread first, then by date). */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "30", 10) || 30, 50);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: payload.userId },
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        referenceType: true,
        referenceId: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: payload.userId, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
