import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireAdmin(req);
  if (payload instanceof NextResponse) return payload;

  const { id } = await params;

  const note = await prisma.adminNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  await prisma.adminNote.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
