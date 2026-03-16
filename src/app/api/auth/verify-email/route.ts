import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";

/** POST: Verify email using token from verification link. */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "auth:verify-email", limit: 12, windowMs: 60_000 });
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : null;
  const fromQuery = req.nextUrl.searchParams.get("token");
  const verificationToken = token || fromQuery;

  if (!verificationToken) {
    return NextResponse.json({ error: "Verification token required" }, { status: 400 });
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: verificationToken },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => {});
    return NextResponse.json({ error: "Verification link has expired" }, { status: 400 });
  }
  if (record.user.emailVerifiedAt) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }).catch(() => {});
    return NextResponse.json({ verified: true, message: "Email already verified" });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.json({ verified: true });
}
