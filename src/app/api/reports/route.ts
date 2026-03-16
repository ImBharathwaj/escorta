import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

type ReportBody = {
  reportType?: "live_session" | "video_call" | "booking" | "sexter_session" | "user";
  referenceId?: string;
  reason?: string;
};

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "user:report", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as ReportBody;
  const { reportType, referenceId } = body;
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;

  if (!reportType || !referenceId) {
    return NextResponse.json({ error: "reportType and referenceId are required" }, { status: 400 });
  }

  try {
    await prisma.sessionReport.upsert({
      where: {
        reporterId_reportType_referenceId: {
          reporterId: auth.userId,
          reportType,
          referenceId,
        },
      },
      update: { reason },
      create: {
        reporterId: auth.userId,
        reportType,
        referenceId,
        reason,
      },
    });
  } catch (e) {
    console.error("[reports] create error", e);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

