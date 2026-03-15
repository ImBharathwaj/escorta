import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { recordCreditTransaction } from "@/lib/creditLedger";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const VERIFICATION_EXPIRY_HOURS = 24;

export async function POST(req: NextRequest) {
  try {
    const { email, phone, password, role = "client" } = await req.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone required" },
        { status: 400 }
      );
    }
    if (!["client", "escort"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const now = new Date();
    const signupCredits = role === "client" ? 10 : 0;
    const user = await prisma.user.create({
      data: {
        role,
        email: email || null,
        phone: phone || null,
        passwordHash,
        credits: signupCredits,
        lastActiveAt: now,
      },
      select: { id: true, role: true, email: true, phone: true, credits: true, emailVerifiedAt: true, createdAt: true },
    });

    if (signupCredits > 0) {
      await recordCreditTransaction({
        userId: user.id,
        amount: signupCredits,
        type: "signup_bonus",
      });
    }

    let verificationUrl: string | undefined;
    if (user.email) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(now.getTime() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      await prisma.emailVerificationToken.create({
        data: { userId: user.id, token: verificationToken, expiresAt },
      });
      verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
      await sendVerificationEmail(user.email, verificationUrl);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const body: { user: object; token: string; verificationUrl?: string } = {
      user: { id: user.id, role: user.role, email: user.email, phone: user.phone, credits: user.credits ?? signupCredits, emailVerifiedAt: user.emailVerifiedAt ?? null },
      token,
    };
    if (process.env.NODE_ENV === "development" && verificationUrl && !process.env.RESEND_API_KEY) {
      body.verificationUrl = verificationUrl;
    }
    return NextResponse.json(body);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Email or phone already registered" },
        { status: 409 }
      );
    }
    throw e;
  }
}
