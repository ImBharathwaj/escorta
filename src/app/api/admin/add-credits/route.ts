import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordCreditTransaction } from "@/lib/creditLedger";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

/** POST: Admin adds credits to a user (for testing). Body: { userIdentifier: string, amount: number } */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "admin:add-credits", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const userIdentifier =
    typeof body.userIdentifier === "string" ? body.userIdentifier.trim() : "";
  const rawAmount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const amount = Math.floor(rawAmount);

  if (!userIdentifier) {
    return NextResponse.json({ error: "userIdentifier is required" }, { status: 400 });
  }
  if (amount < 1) {
    return NextResponse.json({ error: "Amount must be at least 1" }, { status: 400 });
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userIdentifier
    );
  const targetUser = isUuid
    ? await prisma.user.findUnique({ where: { id: userIdentifier } })
    : await prisma.user.findFirst({
        where: { email: { equals: userIdentifier, mode: "insensitive" } },
      });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found (use email or user ID)" },
      { status: 404 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUser.id },
      data: { credits: { increment: amount } },
    }),
  ]);
  await recordCreditTransaction({
    userId: targetUser.id,
    amount,
    type: "admin_grant",
    relatedUserId: auth.userId,
  });

  return NextResponse.json({
    ok: true,
    userId: targetUser.id,
    email: targetUser.email,
    displayName: targetUser.displayName,
    previousCredits: targetUser.credits,
    added: amount,
    newCredits: (targetUser.credits ?? 0) + amount,
  });
}
