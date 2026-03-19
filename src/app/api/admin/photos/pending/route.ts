import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** GET: List pending escort photos for moderation. */
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const photos = await prisma.escortPhoto.findMany({
    where: { reviewStatus: "pending" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      escort: {
        select: {
          id: true,
          aliasName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      escort: {
        id: p.escort.id,
        aliasName: p.escort.aliasName,
        email: p.escort.user.email,
      },
    })),
  });
}

