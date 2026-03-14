import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const VERIFICATION_EXPIRY_HOURS = 24;

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

/** POST: Send verification email to current user (requires auth). */
export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
