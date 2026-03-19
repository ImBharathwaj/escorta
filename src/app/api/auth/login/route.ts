import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { signAccessToken } from "@/lib/jwt";
import { newRefreshToken, setRefreshCookie, sha256, REFRESH_TOKEN_TTL_DAYS } from "@/lib/sessions";

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

    const refresh = newRefreshToken();
    const refreshHash = sha256(refresh);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        expiresAt,
        userAgent: req.headers.get("user-agent") ?? undefined,
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
      },
    });
    await setRefreshCookie(refresh);

    const token = signAccessToken({ userId: user.id, role: user.role, email: user.email });

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
