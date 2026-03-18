import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const DEFAULT_LIMIT = 50;

const TYPE_LABELS: Record<string, string> = {
  connect: "Connection request",
  connect_earned: "Connection request",
  message: "Chat message",
  sexter_session: "Sexter session",
  sexter_extend: "Sexter session (extended)",
  sexter_earned: "Sexter session",
  signup_bonus: "Signup bonus",
  admin_grant: "Admin grant",
  live_watch: "Live stream",
  live_earned: "Live stream",
  video_call: "Video call",
  video_call_extend: "Video call (extended)",
  video_call_earned: "Video call",
  tip: "Tip",
  tip_earned: "Tip",
};

/** GET: Credit usage (client) or earnings (companion) history. */
export async function GET(req: NextRequest) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || DEFAULT_LIMIT, 100);

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      relatedUser: {
        select: {
          id: true,
          displayName: true,
          email: true,
          escortProfile: { select: { aliasName: true } },
        },
      },
    },
  });

  const list = transactions.map((t) => {
    const label = TYPE_LABELS[t.type] ?? t.type;
    let withWhom: string | null = null;
    if (t.relatedUser) {
      if (t.relatedUser.escortProfile?.aliasName) {
        withWhom = t.relatedUser.escortProfile.aliasName;
      } else {
        withWhom = t.relatedUser.displayName || t.relatedUser.email || "Member";
      }
    }
    return {
      id: t.id,
      amount: t.amount,
      type: t.type,
      label,
      withWhom,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      createdAt: t.createdAt,
    };
  });

  const summary = list.reduce(
    (acc, t) => {
      if (t.amount > 0) acc.earned += t.amount;
      else acc.spent += Math.abs(t.amount);
      return acc;
    },
    { spent: 0, earned: 0 }
  );

  // For companions: earnings breakdown by type (e.g. Live stream, Video call, Sexter, Connection)
  const summaryByType: Record<string, number> = {};
  list.forEach((t) => {
    if (t.amount > 0) {
      const key = t.type;
      summaryByType[key] = (summaryByType[key] ?? 0) + t.amount;
    }
  });

  return NextResponse.json({
    transactions: list,
    summary,
    summaryByType: Object.keys(summaryByType).length ? summaryByType : undefined,
  });
}
