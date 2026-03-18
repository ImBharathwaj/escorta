import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Best-effort cleanup:
 * - end active video calls that have expired
 *
 * Protect this route behind an internal scheduler / secret in production.
 */
export async function POST() {
  const now = new Date();
  const res = await prisma.videoCallSession.updateMany({
    where: {
      status: "active",
      expiresAt: { lt: now },
    },
    data: { status: "ended", endedAt: now },
  });
  return NextResponse.json({ ok: true, updated: res.count });
}

