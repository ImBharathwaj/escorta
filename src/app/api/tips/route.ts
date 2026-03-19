import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TIP_MIN_CREDITS, TIP_MAX_CREDITS } from "@/lib/credits";
import { recordTipAndEarn } from "@/lib/creditLedger";
import { requireClient } from "@/lib/auth";
import { requireBookingAccess, requireLiveSessionAccess, requireVideoCallAccess } from "@/lib/authorization";
import { sendEarningsEmail } from "@/lib/email";

type TipContext = "booking" | "sexter_session" | "live_session" | "video_call";

/** POST: Send a tip (client only). Body: { amount: number, context: TipContext, referenceId: string } */
export async function POST(req: NextRequest) {
  const payload = requireClient(req);
  if (payload instanceof NextResponse) return payload;

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
    const bookingAccess = await requireBookingAccess(payload, referenceId);
    if (bookingAccess instanceof NextResponse) return bookingAccess;
    if (bookingAccess.clientId !== payload.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const booking = await prisma.booking.findUnique({ where: { id: referenceId }, select: { escortId: true, status: true } });
    if (!booking || booking.status !== "accepted") return NextResponse.json({ error: "Booking not found or not active" }, { status: 404 });
    escortId = booking.escortId;
  } else if (context === "sexter_session") {
    const session = await prisma.sexterSession.findFirst({
      where: { id: referenceId, clientId: payload.userId },
      select: { escortId: true },
    });
    if (!session?.escortId) return NextResponse.json({ error: "Sexter session not found or access denied" }, { status: 404 });
    escortId = session.escortId;
  } else if (context === "live_session") {
    const liveAccess = await requireLiveSessionAccess(payload, referenceId);
    if (liveAccess instanceof NextResponse) return liveAccess;
    const viewer = await prisma.liveSessionViewer.findUnique({
      where: { liveSessionId_clientId: { liveSessionId: referenceId, clientId: payload.userId } },
      include: { liveSession: { select: { escortId: true } } },
    });
    if (!viewer?.liveSession) return NextResponse.json({ error: "Live session not found or access denied" }, { status: 404 });
    escortId = viewer.liveSession.escortId;
  } else {
    // video_call
    const vcAccess = await requireVideoCallAccess(payload, referenceId);
    if (vcAccess instanceof NextResponse) return vcAccess;
    if (vcAccess.clientId !== payload.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const session = await prisma.videoCallSession.findUnique({ where: { id: referenceId }, select: { escortId: true, status: true } });
    if (!session || session.status !== "active") return NextResponse.json({ error: "Video call not found or ended" }, { status: 404 });
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

  const escortUser = await prisma.user.findUnique({
    where: { id: escortUserId },
    select: { email: true, notifyEmailEarnings: true },
  });
  if (escortUser?.email && escortUser.notifyEmailEarnings) {
    sendEarningsEmail(escortUser.email, amount, "tip", clientLabel).catch(() => {});
  }

  return NextResponse.json({ ok: true, amount });
}
