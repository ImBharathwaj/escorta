import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
    if (decoded.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  return NextResponse.json(gallery);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const title =
    typeof body.title === "string" ? body.title.trim() : undefined;
  const h1 = typeof body.h1 === "string" ? body.h1.trim() : undefined;
  const description =
    typeof body.description === "string" ? body.description.trim() : undefined;
  const slug =
    typeof body.slug === "string" ? body.slug.trim() : undefined;
  const keywordsInput = Array.isArray(body.keywords) ? body.keywords : undefined;
  const keywords =
    keywordsInput &&
    keywordsInput
      .map((k: unknown) => String(k).trim())
      .filter((k: string) => k.length > 0);

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (h1 !== undefined) data.h1 = h1;
  if (description !== undefined) data.description = description;
  if (slug !== undefined) data.slug = slug;
  if (keywords !== undefined) data.keywords = keywords;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.gallery.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

