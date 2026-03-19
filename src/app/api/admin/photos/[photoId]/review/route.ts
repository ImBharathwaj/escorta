import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type Body = { action?: "approve" | "reject"; reason?: string; allowGallery?: boolean };

/** PATCH: Approve/reject an escort photo (admin). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { photoId } = await params;
  const body = (await req.json().catch(() => ({}))) as Body;
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : null;
  const allowGallery = body.allowGallery === true;

  if (!photoId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const photo = await prisma.escortPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, escortId: true, reviewStatus: true },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const now = new Date();
  const next =
    action === "approve"
      ? { reviewStatus: "approved", isApproved: true, reviewedAt: now, reviewedByUserId: auth.userId, reviewReason: reason, allowGallery }
      : { reviewStatus: "rejected", isApproved: false, reviewedAt: now, reviewedByUserId: auth.userId, reviewReason: reason, allowGallery: false };

  await prisma.$transaction([
    prisma.escortPhoto.update({ where: { id: photoId }, data: next }),
    prisma.moderationAction.create({
      data: {
        actorUserId: auth.userId,
        actionType: action === "approve" ? "photo_approve" : "photo_reject",
        targetType: "escort_photo",
        targetId: photoId,
        reason: reason ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

