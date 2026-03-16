import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { ensureBucket } from "@/lib/minio";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

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

// POST: add images to gallery (new uploads and/or existing escort photos)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdmin(req);
  if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id: galleryId } = await params;
  const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f) => f instanceof File) as File[];
  const escortPhotoIds = formData
    .getAll("escortPhotoIds")
    .map((v) => String(v))
    .filter((v) => v.trim().length > 0);

  const createdImages: { id: string }[] = [];

  // reuse escort photos
  if (escortPhotoIds.length > 0) {
    const photos = await prisma.escortPhoto.findMany({
      where: { id: { in: escortPhotoIds } },
      select: { id: true, imageUrl: true },
    });
    for (const p of photos) {
      const alt =
        String(formData.get(`alt_escort_${p.id}`) || "").trim() ||
        "Companion image from escort profile";
      const caption = String(formData.get(`caption_escort_${p.id}`) || "").trim() || null;
      const img = await prisma.galleryImage.create({
        data: {
          galleryId,
          src: p.imageUrl,
          alt,
          caption,
          escortPhotoId: p.id,
        },
      });
      createdImages.push({ id: img.id });
    }
  }

  // new uploads
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name || "upload";
    const type = file.type || "application/octet-stream";
    if (!type.startsWith("image/")) {
      continue;
    }
    if (buffer.length > 10 * 1024 * 1024) {
      continue;
    }
    // Upload to MinIO under gallery/ path (generic helper inline to avoid changing existing avatar/upload helpers).
    const client = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT || "http://192.168.29.222:9000",
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
      },
      forcePathStyle: true,
    });
    await ensureBucket();
    const ext = name.split(".").pop() || (type.startsWith("image/") ? "jpg" : "bin");
    const key = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET || "escort-images",
        Key: key,
        Body: buffer,
        ContentType: type,
      })
    );
    const src =
      `${process.env.MINIO_ENDPOINT || "http://192.168.29.222:9000"}/${process.env.MINIO_BUCKET || "escort-images"}/${key}`;
    const alt =
      String(formData.get(`alt_${name}`) || "").trim() || "Companion themed gallery image";
    const caption = String(formData.get(`caption_${name}`) || "").trim() || null;
    const img = await prisma.galleryImage.create({
      data: {
        galleryId,
        src,
        alt,
        caption,
      },
    });
    createdImages.push({ id: img.id });
  }

  return NextResponse.json({ created: createdImages });
}

