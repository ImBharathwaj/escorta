import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/auth";

/** POST: Client leaves the live session (sets leftAt on viewer record). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const payload = requireClient(req);
  if (payload instanceof NextResponse) return payload;

  const { sessionId } = await params;
  await prisma.liveSessionViewer.updateMany({
    where: { liveSessionId: sessionId, clientId: payload.userId, leftAt: null },
    data: { leftAt: new Date() },
  });

  return NextResponse.json({ left: true });
}
