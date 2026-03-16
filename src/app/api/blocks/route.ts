import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

/**
 * GET /api/blocks
 * Returns who you have blocked and who has blocked you.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "user:blocks", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const [initiated, received] = await Promise.all([
    prisma.userBlock.findMany({
      where: { blockerId: auth.userId },
      include: {
        blocked: { select: { id: true, displayName: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userBlock.findMany({
      where: { blockedId: auth.userId },
      include: {
        blocker: { select: { id: true, displayName: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    blocksInitiated: initiated.map((b) => ({
      userId: b.blocked.id,
      displayName: b.blocked.displayName,
      email: b.blocked.email,
      role: b.blocked.role,
      createdAt: b.createdAt,
    })),
    blocksReceived: received.map((b) => ({
      userId: b.blocker.id,
      displayName: b.blocker.displayName,
      email: b.blocker.email,
      role: b.blocker.role,
      createdAt: b.createdAt,
    })),
  });
}

