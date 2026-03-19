import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_TTL_SECONDS } from "@/lib/sessions";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export type AccessTokenPayload = { userId: string; role: string; email?: string | null };

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

