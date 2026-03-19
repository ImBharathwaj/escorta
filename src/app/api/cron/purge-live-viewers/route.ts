import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Best-effort cleanup:
 * - mark live viewers as left when watchExpiresAt has passed
 *
 * Protect this route behind an internal scheduler / secret in production.
 */
export async function POST() {
  const now = new Date();
  const res = await prisma.liveSessionViewer.updateMany({
    where: {
      leftAt: null,
      watchExpiresAt: { not: null, lt: now },
    },
    data: { leftAt: now },
  });
  return NextResponse.json({ ok: true, updated: res.count });
}

