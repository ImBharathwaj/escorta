import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST { token, newPassword }
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "auth:password-reset:submit", limit: 8, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true } } },
    });

    if (!record || record.usedAt) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }).catch(() => {});
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/reset-password] error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

