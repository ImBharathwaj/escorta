import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

/**
 * POST body: { roomName: string, participantName: string }
 * Returns: { token: string, url: string }
 *
 * For production: authenticate the request (e.g. JWT), derive identity from the
 * logged-in user, and restrict canPublish/canSubscribe by role (e.g. live viewers only subscribe).
 */
export async function POST(req: NextRequest) {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return NextResponse.json(
      { error: "LiveKit not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { roomName, participantName } = body;

  if (!roomName || typeof roomName !== "string" || !participantName || typeof participantName !== "string") {
    return NextResponse.json(
      { error: "roomName and participantName required (strings)" },
      { status: 400 }
    );
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    name: participantName,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, url: LIVEKIT_URL });
}
