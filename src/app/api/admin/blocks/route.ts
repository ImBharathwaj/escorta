import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// GET: list all user blocks (admin only)
export async function GET(req: NextRequest) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const blocks = await prisma.userBlock.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      blocker: { select: { id: true, email: true, displayName: true, role: true } },
      blocked: { select: { id: true, email: true, displayName: true, role: true } },
    },
  });

  return NextResponse.json({
    blocks: blocks.map((b) => ({
      blocker: b.blocker,
      blocked: b.blocked,
      createdAt: b.createdAt,
    })),
  });
}

