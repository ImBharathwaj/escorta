import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteSexterSessionMedia } from "@/lib/minio";
import { SEXTER_RETENTION_DAYS } from "@/lib/credits";

/** Purge sexter sessions after SEXTER_RETENTION_DAYS from session end (manual end or time expiry). Chat is stored and not deleted until then. Call from cron (e.g. daily). */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SEXTER_RETENTION_DAYS);

  const toPurge = await prisma.sexterSession.findMany({
    where: {
      OR: [
        { endedAt: { lt: cutoff } },
        { endedAt: null, expiresAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });

  let deleted = 0;
  for (const s of toPurge) {
    try {
      await deleteSexterSessionMedia(s.id);
    } catch {
      // continue; media may already be gone
    }
    await prisma.sexterMessage.deleteMany({ where: { sexterSessionId: s.id } });
    await prisma.sexterSession.delete({ where: { id: s.id } });
    deleted++;
  }

  return NextResponse.json({ purged: deleted });
}
