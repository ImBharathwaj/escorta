import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const DEFAULT_LIMIT = 50;

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

const TYPE_LABELS: Record<string, string> = {
  connect: "Connection request",
  connect_earned: "Connection request",
  message: "Chat message",
  sexter_session: "Sexter session",
  sexter_extend: "Sexter session (extended)",
  sexter_earned: "Sexter session",
  signup_bonus: "Signup bonus",
  live_watch: "Live stream",
  live_earned: "Live stream",
  video_call: "Video call",
  video_call_extend: "Video call (extended)",
  video_call_earned: "Video call",
};

/** GET: Credit usage (client) or earnings (companion) history. */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({
    transactions: list,
    summary,
  });
}
