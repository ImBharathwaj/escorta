import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60 * 60 * 24; // 24h

export async function GET() {
  const services = await prisma.adultService.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json(services, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
