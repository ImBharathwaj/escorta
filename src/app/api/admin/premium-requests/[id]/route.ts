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

/** PATCH: Admin — approve or reject a premium request. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action === "approve" ? "approve" : body.action === "reject" ? "reject" : null;
  const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 2000) : null;

  if (!action) return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });

  const premiumRequest = await prisma.escortPremiumRequest.findUnique({
    where: { id },
    include: { escort: { select: { id: true } } },
  });
  if (!premiumRequest) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (premiumRequest.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });
  }

  const now = new Date();
  if (action === "approve") {
    await prisma.$transaction([
      prisma.escortProfile.update({
        where: { id: premiumRequest.escortId },
        data: { isPremium: true },
      }),
      prisma.escortPremiumRequest.update({
        where: { id },
        data: {
          status: "approved",
          adminNotes: adminNotes ?? undefined,
          reviewedAt: now,
          reviewedByUserId: payload.userId,
        },
      }),
    ]);
    return NextResponse.json({ success: true, status: "approved" });
  }

  await prisma.escortPremiumRequest.update({
    where: { id },
    data: {
      status: "rejected",
      adminNotes: adminNotes ?? undefined,
      reviewedAt: now,
      reviewedByUserId: payload.userId,
    },
  });
  return NextResponse.json({ success: true, status: "rejected" });
}
