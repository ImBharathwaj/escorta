import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/unblock
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "user:unblock", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const targetId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!targetId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    await prisma.userBlock.deleteMany({
      where: {
        blockerId: auth.userId,
        blockedId: targetId,
      },
    });
  } catch (e) {
    console.error("[unblock] error", e);
    return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

