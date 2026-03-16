import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

/**
 * PATCH /api/admin/users/[id]
 * Body: { isBanned?: boolean, isActive?: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const isBanned = typeof body.isBanned === "boolean" ? body.isBanned : undefined;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

  if (!id) return NextResponse.json({ error: "User id required" }, { status: 400 });
  if (isBanned === undefined && isActive === undefined) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const data: { isBanned?: boolean; isActive?: boolean } = {};
  if (isBanned !== undefined) data.isBanned = isBanned;
  if (isActive !== undefined) data.isActive = isActive;

  try {
    await prisma.user.update({
      where: { id },
      data,
    });
  } catch (e) {
    console.error("[admin:users:PATCH] error", e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
