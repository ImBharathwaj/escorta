import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearRefreshCookie, getRefreshCookie, sha256 } from "@/lib/sessions";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUserIdFromAccessToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromAccessToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });

  const refresh = await getRefreshCookie();
  if (refresh) {
    const refreshHash = sha256(refresh);
    await prisma.userSession.updateMany({
      where: { refreshTokenHash: refreshHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}

