import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.MINIO_BUCKET || "escort-images";
const ENDPOINT = process.env.MINIO_ENDPOINT || "http://192.168.29.222:9000";

function parseEndpoint(url: string): { host: string; port: number; protocol: string } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : u.protocol === "https:" ? 443 : 9000,
      protocol: u.protocol.replace(":", ""),
    };
  } catch {
    return { host: "localhost", port: 9000, protocol: "http" };
  }
}

function getClient() {
  const { host, port, protocol } = parseEndpoint(ENDPOINT);
  return new S3Client({
    endpoint: `${protocol}://${host}:${port}`,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    },
    forcePathStyle: true,
  });
}

function extractKeyFromStoredUrl(storedUrl: string): string | null {
  try {
    const u = new URL(storedUrl);
    const path = u.pathname.replace(/^\//, "");
    const bucketPrefix = `${BUCKET}/`;
    if (!path.startsWith(bucketPrefix)) return null;
    return path.slice(bucketPrefix.length);
  } catch {
    return null;
  }
}

/**
 * GET /api/media?src=<storedMinioUrl>
 *
 * Proxies a stored MinIO URL through the app origin so images work over HTTPS
 * (avoids mixed-content and private bucket issues).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const src = searchParams.get("src") || "";
  if (!src) return NextResponse.json({ error: "src required" }, { status: 400 });

  // Basic SSRF protection: only allow URLs that match our bucket path format.
  const key = extractKeyFromStoredUrl(src);
  if (!key) return NextResponse.json({ error: "Invalid src" }, { status: 400 });

  try {
    const client = getClient();
    const obj = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = obj.Body;
    if (!body) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Body is a stream in Node. Return it directly.
    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": obj.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[api/media] error", e);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

