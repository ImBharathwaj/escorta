import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/**
 * GET /api/admin/users?q=...&banned=0|1&role=client|escort|admin
 * List users with optional search (email, displayName) and filters.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const bannedParam = searchParams.get("banned");
  const role = searchParams.get("role") || "";

  const where: Record<string, unknown> = {};
  if (bannedParam === "1") where.isBanned = true;
  else if (bannedParam === "0") where.isBanned = false;
  if (role && ["client", "escort", "admin"].includes(role)) where.role = role;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
      ...(q.length >= 8 ? [{ id: q }] : []),
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isBanned: true,
      isActive: true,
      createdAt: true,
      _count: { select: { bookingsAsClient: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ users });
}
