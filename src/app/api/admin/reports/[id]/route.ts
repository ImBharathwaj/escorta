import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { encryptOptional } from "@/lib/fieldEncryption";

/**
 * PATCH /api/admin/reports/[id]
 * Body: { action: "mark_resolved" | "ban_user", banUserId?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (!id) {
    return NextResponse.json({ error: "Report id required" }, { status: 400 });
  }

  if (action === "ban_user") {
    const banUserId = typeof body.banUserId === "string" ? body.banUserId : null;
    if (!banUserId) {
      return NextResponse.json({ error: "banUserId required" }, { status: 400 });
    }
    try {
      await prisma.user.update({
        where: { id: banUserId },
        data: { isBanned: true, isActive: false },
      });
      await prisma.moderationAction.create({
        data: {
          actorUserId: auth.userId,
          actionType: "ban_user",
          targetType: "user",
          targetId: banUserId,
          reason: encryptOptional(`Triggered from report ${id}`),
        },
      });
    } catch (e) {
      console.error("[admin:reports:ban_user] error", e);
      return NextResponse.json({ error: "Failed to ban user" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "ban_user" });
  }

  if (action === "mark_resolved") {
    // For now we simply delete the report as "resolved"; history is in logs.
    try {
      await prisma.moderationAction.create({
        data: {
          actorUserId: auth.userId,
          actionType: "report_resolve",
          targetType: "session_report",
          targetId: id,
          reason: encryptOptional("Marked resolved"),
        },
      });
      await prisma.sessionReport.delete({ where: { id } });
    } catch (e) {
      console.error("[admin:reports:mark_resolved] error", e);
      return NextResponse.json({ error: "Failed to resolve report" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "mark_resolved" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

