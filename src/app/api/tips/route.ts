import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { TIP_MIN_CREDITS, TIP_MAX_CREDITS } from "@/lib/credits";
import { recordTipAndEarn } from "@/lib/creditLedger";

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

type TipContext = "booking" | "sexter_session" | "live_session" | "video_call";

/** POST: Send a tip (client only). Body: { amount: number, context: TipContext, referenceId: string } */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") {
    return NextResponse.json({ error: "Only clients can send tips" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const rawAmount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const amount = Math.floor(rawAmount);
  const context = body.context as TipContext | undefined;
  const referenceId = typeof body.referenceId === "string" ? body.referenceId.trim() : "";

  if (!["booking", "sexter_session", "live_session", "video_call"].includes(context || "") || !referenceId) {
    return NextResponse.json({ error: "Invalid context or referenceId" }, { status: 400 });
  }
  if (amount < TIP_MIN_CREDITS || amount > TIP_MAX_CREDITS) {
    return NextResponse.json(
      { error: `Tip must be between ${TIP_MIN_CREDITS} and ${TIP_MAX_CREDITS} credits` },
      { status: 400 }
    );
  }

  let escortId: string;
  let referenceType: "booking" | "sexter_session" | "live_session" | "video_call" = context as any;

  if (context === "booking") {
    const booking = await prisma.booking.findFirst({
      where: { id: referenceId, clientId: payload.userId, status: "accepted" },
      select: { escortId: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found or access denied" }, { status: 404 });
    escortId = booking.escortId;
  } else if (context === "sexter_session") {
    const session = await prisma.sexterSession.findFirst({
      where: { id: referenceId, clientId: payload.userId },
      select: { escortId: true },
    });
    if (!session?.escortId) return NextResponse.json({ error: "Sexter session not found or access denied" }, { status: 404 });
    escortId = session.escortId;
  } else if (context === "live_session") {
    const viewer = await prisma.liveSessionViewer.findFirst({
      where: { liveSessionId: referenceId, clientId: payload.userId },
      include: { liveSession: { select: { escortId: true } } },
    });
    if (!viewer?.liveSession) return NextResponse.json({ error: "Live session not found or access denied" }, { status: 404 });
    escortId = viewer.liveSession.escortId;
  } else {
    // video_call
    const session = await prisma.videoCallSession.findFirst({
      where: { id: referenceId, clientId: payload.userId, status: "active" },
      select: { escortId: true },
    });
    if (!session) return NextResponse.json({ error: "Video call not found or access denied" }, { status: 404 });
    escortId = session.escortId;
  }

  const [client, escort] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.userId }, select: { credits: true } }),
    prisma.escortProfile.findUnique({ where: { id: escortId }, select: { userId: true } }),
  ]);
  if (!client || (client.credits ?? 0) < amount) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "NEED_CREDITS", required: amount },
      { status: 402 }
    );
  }
  const escortUserId = escort?.userId;
  if (!escortUserId) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: payload.userId },
      data: { credits: { decrement: amount } },
    }),
    prisma.user.update({
      where: { id: escortUserId },
      data: { credits: { increment: amount } },
    }),
  ]);

  await recordTipAndEarn({
    clientUserId: payload.userId,
    escortId,
    amount,
    referenceType,
    referenceId,
  });

  const clientUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { displayName: true, email: true },
  });
  const clientLabel = clientUser?.displayName?.trim() || clientUser?.email || "A client";

  await prisma.notification.create({
    data: {
      userId: escortUserId,
      type: "tip",
      title: `${clientLabel} tipped you ${amount} credit${amount !== 1 ? "s" : ""}`,
      referenceType,
      referenceId,
      relatedUserId: payload.userId,
    },
  });

  return NextResponse.json({ ok: true, amount });
}
