import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getAuth(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

/** GET: Platform analytics (admin only). */
export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [earnedAgg, spentAgg, txCount, liveCount, videoCallCount, reportCount] = await Promise.all([
    prisma.creditTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } },
    }),
    prisma.creditTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { lt: 0 } },
    }),
    prisma.creditTransaction.count(),
    prisma.liveSession.count(),
    prisma.videoCallSession.count(),
    prisma.sessionReport.count(),
  ]);

  const earned = earnedAgg._sum.amount ?? 0;
  const spent = Math.abs(spentAgg._sum.amount ?? 0);

  return NextResponse.json({
    credits: {
      totalTransactions: txCount,
      totalEarned: earned,
      totalSpent: spent,
    },
    sessions: {
      liveSessions: liveCount,
      videoCalls: videoCallCount,
    },
    reports: {
      sessionReports: reportCount,
    },
  });
}
