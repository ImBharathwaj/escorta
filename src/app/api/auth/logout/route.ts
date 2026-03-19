import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearRefreshCookie, getRefreshCookie, sha256 } from "@/lib/sessions";

export async function POST(_req: NextRequest) {
  const refresh = await getRefreshCookie();
  if (refresh) {
    const refreshHash = sha256(refresh);
    await prisma.userSession.updateMany({
      where: { refreshTokenHash: refreshHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}

