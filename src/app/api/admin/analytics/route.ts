import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** GET: Platform analytics (admin only). */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

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
