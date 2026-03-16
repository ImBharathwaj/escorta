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

/** GET: List tips earned for this booking (escort only, used for connection chat). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "escort") {
    return NextResponse.json({ error: "Only companions can view booking tips" }, { status: 403 });
  }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { escort: { select: { userId: true } } },
  });
  if (!booking || booking.escort.userId !== payload.userId) {
    return NextResponse.json({ error: "Connection not found or access denied" }, { status: 404 });
  }

  const transactions = await prisma.creditTransaction.findMany({
    where: {
      userId: payload.userId,
      type: "tip_earned",
      referenceType: "booking",
      referenceId: id,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      relatedUser: { select: { displayName: true, email: true } },
    },
  });

  const tips = transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    clientName:
      t.relatedUser?.displayName?.trim() || t.relatedUser?.email || "A client",
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json({ tips });
}

