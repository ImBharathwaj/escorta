import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_EXPIRY_MINUTES = 30;

/**
 * POST { email }
 * Always returns 200 to avoid leaking whether an email exists.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "auth:password-reset:request", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true, email: true },
    });

    if (user?.email) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for this email, a reset link has been sent.",
    });
  } catch (e) {
    console.error("[auth/request-password-reset] error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

