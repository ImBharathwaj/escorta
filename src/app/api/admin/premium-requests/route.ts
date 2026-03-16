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

/** GET: Admin — list premium requests (default: pending first). */
export async function GET(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status"); // pending | approved | rejected | all

  const where = statusFilter && statusFilter !== "all" ? { status: statusFilter } : {};
  const requests = await prisma.escortPremiumRequest.findMany({
    where,
    include: {
      escort: {
        select: {
          id: true,
          aliasName: true,
          isPremium: true,
          user: { select: { email: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const ordered = requests.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return NextResponse.json({
    requests: ordered.map((r) => ({
      id: r.id,
      escortId: r.escortId,
      escortName: r.escort.aliasName,
      escortEmail: r.escort.user?.email,
      isPremium: r.escort.isPremium,
      status: r.status,
      message: r.message,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    })),
  });
}
