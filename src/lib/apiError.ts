import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Normalized API error response. Use in catch blocks to avoid leaking stack traces.
 * Always returns { error: string } and optionally { code?: string }.
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string
): NextResponse {
  const body: { error: string; code?: string } = { error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

/**
 * Wrap an async handler to catch errors and return normalized JSON (no stack traces).
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[API error]", e);
      Sentry.captureException(e);
      return apiError("Internal server error", 500);
    }
  };
}
