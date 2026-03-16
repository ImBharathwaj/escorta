import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// PATCH: soft-delete a sexter message (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Message id required" }, { status: 400 });

  try {
    await prisma.sexterMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch (e) {
    console.error("[admin:sexter-messages:hide] error", e);
    return NextResponse.json({ error: "Failed to hide sexter message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

