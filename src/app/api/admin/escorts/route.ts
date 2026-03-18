import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * Admin-only: List all escorts for moderation.
 */
export async function GET(req: NextRequest) {
  const payload = requireAdmin(req);
  if (payload instanceof NextResponse) return payload;

  const escorts = await prisma.escortProfile.findMany({
    select: {
      id: true,
      aliasName: true,
      age: true,
      city: true,
      gender: true,
      isVerified: true,
      isGenderVerified: true,
      isActive: true,
      isSpotlighted: true,
      user: { select: { email: true } },
      photos: {
        where: { isApproved: true },
        orderBy: [{ isPrimary: "desc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ escorts });
}
