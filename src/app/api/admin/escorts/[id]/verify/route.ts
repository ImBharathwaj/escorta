import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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

/**
 * Admin-only: Update escort verification status.
 * PATCH body: { isVerified?: boolean, isGenderVerified?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { isVerified, isGenderVerified } = body;

  const escort = await prisma.escortProfile.findUnique({ where: { id } });
  if (!escort) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  const data: { isVerified?: boolean; isGenderVerified?: boolean } = {};
  if (typeof isVerified === "boolean") data.isVerified = isVerified;
  if (typeof isGenderVerified === "boolean") data.isGenderVerified = isGenderVerified;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const updated = await prisma.escortProfile.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
