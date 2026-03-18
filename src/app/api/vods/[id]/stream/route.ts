import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import type { AuthPayload } from "@/lib/auth";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const BUCKET = process.env.MINIO_BUCKET || "escort-images";

function getS3() {
  const endpoint = process.env.MINIO_ENDPOINT || "http://192.168.29.222:9000";
  return new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true,
  });
}

function getEscortPayload(req: NextRequest): AuthPayload | null {
  const auth = req.headers.get("authorization");
  const raw = auth?.startsWith("Bearer ")
    ? auth.slice(7)
    : req.nextUrl.searchParams.get("token");
  if (!raw) return null;
  try {
    const p = jwt.verify(raw, JWT_SECRET) as AuthPayload;
    return p.role === "escort" ? p : null;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getEscortPayload(req);
  if (!payload)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vod = await prisma.escortVod.findUnique({
    where: { id },
    include: { escort: { select: { userId: true } } },
  });
  if (!vod) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (vod.escort.userId !== payload.userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const s3 = getS3();
  const range = req.headers.get("range");

  if (!range) {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: vod.storageKey })
    );
    const total = head.ContentLength ?? 0;
    const contentType = head.ContentType ?? "video/mp4";

    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: vod.storageKey })
    );
    const stream = obj.Body as ReadableStream;

    return new Response(stream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const head = await s3.send(
    new HeadObjectCommand({ Bucket: BUCKET, Key: vod.storageKey })
  );
  const total = head.ContentLength ?? 0;
  const contentType = head.ContentType ?? "video/mp4";

  const match = range.match(/bytes=(\d+)-(\d*)/);
  const start = match ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : total - 1;

  const obj = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: vod.storageKey,
      Range: `bytes=${start}-${end}`,
    })
  );
  const stream = obj.Body as ReadableStream;

  return new Response(stream as unknown as BodyInit, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
