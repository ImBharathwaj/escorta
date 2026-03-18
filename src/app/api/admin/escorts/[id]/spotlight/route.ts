import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireAdmin(req);
  if (payload instanceof NextResponse) return payload;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (typeof body.isSpotlighted !== "boolean") {
    return NextResponse.json(
      { error: "isSpotlighted (boolean) required" },
      { status: 400 }
    );
  }

  const escort = await prisma.escortProfile.findUnique({ where: { id } });
  if (!escort) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }

  const updated = await prisma.escortProfile.update({
    where: { id },
    data: { isSpotlighted: body.isSpotlighted },
  });

  return NextResponse.json(updated);
}
