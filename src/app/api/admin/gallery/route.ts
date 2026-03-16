import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// GET: list galleries (admin overview)
export async function GET(req: NextRequest) {
  const admin = requireRole(req, "admin");
  if (admin instanceof NextResponse) return admin;

  const galleries = await prisma.gallery.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      h1: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { images: true } },
    },
  });

  return NextResponse.json({
    galleries: galleries.map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      h1: g.h1,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      imageCount: g._count.images,
    })),
  });
}

// POST: create a new gallery shell
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { keyPrefix: "admin:gallery:create", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const admin = requireRole(req, "admin");
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const h1 = typeof body.h1 === "string" ? body.h1.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const keywordsInput = Array.isArray(body.keywords) ? body.keywords : [];
  const keywords = keywordsInput
    .map((k: unknown) => String(k).trim())
    .filter((k: string) => k.length > 0);

  if (!slug || !title || !h1 || !description) {
    return NextResponse.json(
      { error: "slug, title, h1, and description are required" },
      { status: 400 }
    );
  }

  const exists = await prisma.gallery.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const gallery = await prisma.gallery.create({
    data: {
      slug,
      title,
      h1,
      description,
      keywords,
    },
  });

  return NextResponse.json(gallery);
}

