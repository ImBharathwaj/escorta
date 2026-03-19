import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { sendConnectionAcceptedEmail } from "@/lib/email";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "escort") {
    return NextResponse.json(
      { error: "Only companions can respond to requests" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!status || !["accepted", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'accepted' or 'rejected'" },
      { status: 400 }
    );
  }

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id, escortId: profile.id, status: "pending" },
  });
  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found or already responded" },
      { status: 404 }
    );
  }

  await prisma.booking.update({
    where: { id },
    data: { status },
  });

  if (status === "accepted") {
    const escortUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { escortProfile: { select: { aliasName: true } } },
    });
    const clientUser = await prisma.user.findUnique({
      where: { id: booking.clientId },
      select: { email: true, notifyEmailConnections: true },
    });

    const escortName = escortUser?.escortProfile?.aliasName || "A companion";

    await prisma.notification.create({
      data: {
        userId: booking.clientId,
        type: "connection_accepted",
        title: `${escortName} accepted your connection request`,
        referenceType: "booking",
        referenceId: booking.id,
        relatedUserId: payload.userId,
      },
    });

    if (clientUser?.email && clientUser.notifyEmailConnections) {
      sendConnectionAcceptedEmail(clientUser.email, escortName).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, status });
}
