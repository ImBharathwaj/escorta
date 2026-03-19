import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STALE_HOURS = 4;

/**
 * Cleanup: end live sessions that have been running for more than STALE_HOURS
 * without the broadcaster calling the end API (e.g., tab was closed, network lost).
 *
 * Also marks all active viewers in those sessions as left.
 */
export async function POST() {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);
  const now = new Date();

  const stale = await prisma.liveSession.findMany({
    where: { status: "live", startedAt: { lt: cutoff } },
    select: { id: true },
  });

  if (stale.length === 0) {
    return NextResponse.json({ ok: true, ended: 0 });
  }

  const ids = stale.map((s) => s.id);

  await prisma.liveSessionViewer.updateMany({
    where: { liveSessionId: { in: ids }, leftAt: null },
    data: { leftAt: now },
  });

  const res = await prisma.liveSession.updateMany({
    where: { id: { in: ids } },
    data: { status: "ended", endedAt: now },
  });

  return NextResponse.json({ ok: true, ended: res.count });
}
