import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

let receiver: WebhookReceiver | null = null;
function getReceiver() {
  if (!receiver && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
    receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return receiver;
}

export async function POST(req: NextRequest) {
  const recv = getReceiver();
  if (!recv) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const authHeader = req.headers.get("authorization") || "";

  let event;
  try {
    event = await recv.receive(body, authHeader);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const now = new Date();

  switch (event.event) {
    case "room_finished": {
      const roomName = event.room?.name;
      if (!roomName) break;

      await prisma.liveSession.updateMany({
        where: { roomName, status: "live" },
        data: { status: "ended", endedAt: now },
      });

      const ls = await prisma.liveSession.findFirst({
        where: { roomName },
        select: { id: true },
      });
      if (ls) {
        await prisma.liveSessionViewer.updateMany({
          where: { liveSessionId: ls.id, leftAt: null },
          data: { leftAt: now },
        });
      }

      await prisma.videoCallSession.updateMany({
        where: { roomName, status: "active" },
        data: { status: "ended", endedAt: now },
      });
      break;
    }

    case "participant_left": {
      const roomName = event.room?.name;
      const identity = event.participant?.identity;
      if (!roomName || !identity) break;

      if (identity.startsWith("escort-")) {
        await prisma.liveSession.updateMany({
          where: { roomName, status: "live" },
          data: { status: "ended", endedAt: now },
        });
        const ls = await prisma.liveSession.findFirst({
          where: { roomName },
          select: { id: true },
        });
        if (ls) {
          await prisma.liveSessionViewer.updateMany({
            where: { liveSessionId: ls.id, leftAt: null },
            data: { leftAt: now },
          });
        }
      }

      if (identity.startsWith("client-")) {
        const userId = identity.replace("client-", "");
        const ls = await prisma.liveSession.findFirst({
          where: { roomName },
          select: { id: true },
        });
        if (ls) {
          await prisma.liveSessionViewer.updateMany({
            where: { liveSessionId: ls.id, clientId: userId, leftAt: null },
            data: { leftAt: now },
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
