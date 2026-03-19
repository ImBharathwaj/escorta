import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      notifyEmailConnections: true,
      notifyEmailMessages: true,
      notifyEmailEarnings: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, boolean> = {};

  if (typeof body.notifyEmailConnections === "boolean") data.notifyEmailConnections = body.notifyEmailConnections;
  if (typeof body.notifyEmailMessages === "boolean") data.notifyEmailMessages = body.notifyEmailMessages;
  if (typeof body.notifyEmailEarnings === "boolean") data.notifyEmailEarnings = body.notifyEmailEarnings;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: payload.userId },
    data,
    select: {
      notifyEmailConnections: true,
      notifyEmailMessages: true,
      notifyEmailEarnings: true,
    },
  });

  return NextResponse.json(user);
}
