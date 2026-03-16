import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/block
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "user:block", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const targetId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!targetId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (targetId === auth.userId) {
    return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 });
  }

  try {
    await prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: auth.userId,
          blockedId: targetId,
        },
      },
      update: {},
      create: {
        blockerId: auth.userId,
        blockedId: targetId,
      },
    });
  } catch (e) {
    console.error("[block] error", e);
    return NextResponse.json({ error: "Failed to block user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

