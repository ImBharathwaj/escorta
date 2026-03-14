import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getSignedImageUrl } from "@/lib/minio";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      displayName: true,
      avatarUrl: true,
      isPremiumMember: true,
      credits: true,
      createdAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const avatarSignedUrl = user.avatarUrl
    ? await getSignedImageUrl(user.avatarUrl).catch(() => null)
    : null;
  return NextResponse.json({ ...user, avatarSignedUrl });
}

export async function PATCH(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { display_name, email, phone } = body;

  await prisma.user.update({
    where: { id: payload.userId },
    data: {
      ...(display_name !== undefined && { displayName: display_name?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
    },
  });

  const updated = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      displayName: true,
      avatarUrl: true,
      isPremiumMember: true,
      credits: true,
      createdAt: true,
    },
  });
  return NextResponse.json(updated);
}
