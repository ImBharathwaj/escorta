import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const VALID_TARGET_TYPES = [
  "user",
  "booking",
  "video_call",
  "live_session",
  "sexter_session",
];

export async function GET(req: NextRequest) {
  const payload = requireAdmin(req);
  if (payload instanceof NextResponse) return payload;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const targetType = searchParams.get("targetType");
  const targetRefId = searchParams.get("targetRefId");

  const where: Record<string, unknown> = {};
  if (userId) where.targetUserId = userId;
  if (targetType) where.targetType = targetType;
  if (targetRefId) where.targetRefId = targetRefId;

  const notes = await prisma.adminNote.findMany({
    where,
    include: {
      author: { select: { displayName: true, email: true } },
      targetUser: { select: { displayName: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const payload = requireAdmin(req);
  if (payload instanceof NextResponse) return payload;

  const body = await req.json().catch(() => ({}));
  const { targetUserId, targetType, targetRefId, content } = body;

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json(
      { error: "targetUserId required" },
      { status: 400 }
    );
  }
  if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
    return NextResponse.json(
      { error: `targetType must be one of: ${VALID_TARGET_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "content required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const note = await prisma.adminNote.create({
    data: {
      targetUserId,
      authorUserId: payload.userId,
      targetType,
      targetRefId: targetRefId || null,
      content: content.trim(),
    },
    include: {
      author: { select: { displayName: true, email: true } },
      targetUser: { select: { displayName: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
