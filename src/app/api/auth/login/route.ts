import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "auth:login", limit: 12, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email, phone, password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email || undefined }, { phone: phone || undefined }],
        deletedAt: null,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), lastActiveAt: new Date(), updatedAt: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName ?? null,
        avatarUrl: user.avatarUrl ?? null,
        isPremiumMember: user.isPremiumMember ?? false,
        credits: user.credits ?? 0,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
      },
      token,
    });
  } catch (e) {
    console.error("[auth/login] error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
