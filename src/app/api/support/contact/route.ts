import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { sendSupportEmail } from "@/lib/email";
import { getAuthPayload } from "@/lib/auth";

/**
 * POST { email?: string, category?: string, message: string }
 * Rate limited. If logged in, includes user context.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "support:contact", limit: 3, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message || message.length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 });
    }

    const auth = getAuthPayload(req);
    await sendSupportEmail({
      fromEmail: email || auth?.email || undefined,
      category,
      message,
      userId: auth?.userId,
      userRole: auth?.role,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[support/contact] error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

