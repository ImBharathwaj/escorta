import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { SEXTER_SESSION_CREDITS, SEXTER_SESSION_MINUTES } from "@/lib/credits";
import { recordClientSpendAndCompanionEarn } from "@/lib/creditLedger";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

/** POST: Client only. Extend active sexter session; 1 credit per 5 min. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ escortId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const { escortId } = await params;
  const clientUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { credits: true },
  });
  const credits = clientUser?.credits ?? 0;
  if (credits < SEXTER_SESSION_CREDITS) {
    return NextResponse.json(
      {
        error: "Insufficient credits.",
        message: "Your companion is waiting. Get credits to continue the conversation.",
        code: "NEED_CREDITS",
      },
      { status: 402 }
    );
  }

  const session = await prisma.sexterSession.findFirst({
    where: { clientId: payload.userId, escortId, endedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json(
      { error: "No active session. Send a message to start one." },
      { status: 400 }
    );
  }

  const now = new Date();
  const from = now > session.expiresAt ? now : session.expiresAt;
  const newExpiresAt = new Date(from.getTime() + SEXTER_SESSION_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.sexterSession.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    }),
    prisma.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: SEXTER_SESSION_CREDITS } },
    }),
  ]);

  await recordClientSpendAndCompanionEarn({
    clientUserId: payload.userId,
    escortId,
    amount: SEXTER_SESSION_CREDITS,
    type: "sexter_extend",
    sexterSessionId: session.id,
  });

  return NextResponse.json({ expiresAt: newExpiresAt });
}
