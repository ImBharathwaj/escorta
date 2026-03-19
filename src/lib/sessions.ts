import crypto from "crypto";
import { cookies } from "next/headers";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_DAYS = 30;

export const REFRESH_COOKIE_NAME = "escorta_refresh";

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function newRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export async function getRefreshCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(REFRESH_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function setRefreshCookie(value: string): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  const store = await cookies();
  store.set({
    name: REFRESH_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge,
  });
}

export async function clearRefreshCookie(): Promise<void> {
  const store = await cookies();
  store.set({
    name: REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

