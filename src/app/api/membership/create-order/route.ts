import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const MEMBERSHIP_AMOUNT = parseInt(process.env.MEMBERSHIP_AMOUNT || "999", 10);

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Sign in to unlock" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 500 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { isPremiumMember: true },
  });

  if (user?.isPremiumMember) {
    return NextResponse.json({ error: "Already a premium member" }, { status: 400 });
  }

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const amountInPaise = MEMBERSHIP_AMOUNT * 100;
  const receipt = `membership_${payload.userId}_${Date.now()}`;

  try {
    const order = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: { user_id: payload.userId },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: amountInPaise,
      currency: order.currency,
      amount_display: MEMBERSHIP_AMOUNT,
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
