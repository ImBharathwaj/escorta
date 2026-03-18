import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const escorts = await prisma.escortProfile.findMany({
    where: { isActive: true, isSpotlighted: true },
    include: {
      photos: {
        where: { isApproved: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const spotlighted = escorts.map((e) => ({
    id: e.id,
    aliasName: e.aliasName,
    age: e.age,
    city: e.city,
    gender: e.gender,
    isVerified: e.isVerified,
    isGenderVerified: e.isGenderVerified,
    photoId: e.photos[0]?.id ?? null,
  }));

  return NextResponse.json({ spotlighted });
}
