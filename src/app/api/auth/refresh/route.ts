import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken } from "@/lib/jwt";
import { clearRefreshCookie, getRefreshCookie, newRefreshToken, setRefreshCookie, sha256, REFRESH_TOKEN_TTL_DAYS } from "@/lib/sessions";

export async function POST(_req: NextRequest) {
  const refresh = await getRefreshCookie();
  if (!refresh) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const refreshHash = sha256(refresh);
  const session = await prisma.userSession.findUnique({
    where: { refreshTokenHash: refreshHash },
    include: { user: { select: { id: true, role: true, email: true, isBanned: true, deletedAt: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt <= now) {
    await clearRefreshCookie();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.deletedAt || session.user.isBanned) {
    await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: now } });
    await clearRefreshCookie();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rotated = newRefreshToken();
  const rotatedHash = sha256(rotated);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.userSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: rotatedHash, lastUsedAt: now, expiresAt: refreshExpiresAt },
  });
  await setRefreshCookie(rotated);

  const token = signAccessToken({ userId: session.user.id, role: session.user.role, email: session.user.email });
  return NextResponse.json({ token });
}

