import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export async function createLiveKitToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish: boolean;
  canSubscribe: boolean;
}): Promise<{ token: string; url: string } | null> {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return null;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: params.participantIdentity,
    name: params.participantName,
  });
  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: params.canPublish,
    canSubscribe: params.canSubscribe,
  });
  const token = await at.toJwt();
  return { token, url: LIVEKIT_URL };
}
