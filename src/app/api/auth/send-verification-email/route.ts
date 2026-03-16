import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const VERIFICATION_EXPIRY_HOURS = 24;

/** POST: Send verification email to current user (requires auth). */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "auth:send-verification", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.email) return NextResponse.json({ error: "No email to verify" }, { status: 400 });
  if (user.emailVerifiedAt) return NextResponse.json({ message: "Email already verified" });

  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token: verificationToken, expiresAt },
  });

  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  const sent = await sendVerificationEmail(user.email, verifyUrl);

  if (!sent) {
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
  const res: { message: string; verificationUrl?: string } = { message: "Verification email sent" };
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    res.verificationUrl = verifyUrl;
  }
  return NextResponse.json(res);
}
