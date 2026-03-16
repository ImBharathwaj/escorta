import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// PATCH: soft-delete a connection message (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Message id required" }, { status: 400 });

  try {
    await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    console.error("[admin:messages:hide] error", e);
    return NextResponse.json({ error: "Failed to hide message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

