import { NextRequest, NextResponse } from "next/server";

type RateLimitConfig = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type Bucket = { count: number; resetAt: number };

// In-memory rate limiter (single instance).
// For multi-instance production, replace with Redis.
const buckets = new Map<string, Bucket>();

function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(req: NextRequest, config: RateLimitConfig): NextResponse | null {
  const ip = getIp(req);
  const key = `${config.keyPrefix}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (existing.count >= config.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}

