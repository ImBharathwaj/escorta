import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export type AuthPayload = { userId: string; role: string; email?: string | null };

export function getAuthPayload(req: NextRequest): AuthPayload | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): AuthPayload | NextResponse {
  const payload = getAuthPayload(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return payload;
}

export function requireRole(
  req: NextRequest,
  role: string
): AuthPayload | NextResponse {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;
  if (payload.role !== role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return payload;
}

export function requireAnyRole(
  req: NextRequest,
  roles: string[]
): AuthPayload | NextResponse {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;
  if (!roles.includes(payload.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return payload;
}

export function requireAdmin(req: NextRequest) {
  return requireRole(req, "admin");
}

export function requireClient(req: NextRequest) {
  return requireRole(req, "client");
}

export function requireEscort(req: NextRequest) {
  return requireRole(req, "escort");
}

