import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const MEMBERSHIP_AMOUNT = parseInt(process.env.MEMBERSHIP_AMOUNT || "999", 10);
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Sign in to unlock" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body;

  if (!RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Razorpay not configured" },
      { status: 500 }
    );
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Payment verification failed. Missing payment details." },
      { status: 400 }
    );
  }

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    return NextResponse.json(
      { error: "Payment verification failed. Invalid signature." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: { isPremiumMember: true },
  });

  return NextResponse.json({
    success: true,
    message: "Membership unlocked",
    amount: MEMBERSHIP_AMOUNT,
  });
}
