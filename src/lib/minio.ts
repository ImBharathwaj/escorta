import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function ensureBucket() {
  const client = getClient();
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
}

export async function uploadPhoto(
  escortId: string,
  buffer: Buffer,
  filename: string,
  contentType = "image/jpeg"
): Promise<string> {
  const client = getClient();
  await ensureBucket();

  const ext = filename.split(".").pop() || "jpg";
  const key = `${escortId}/${Date.now()}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${ENDPOINT}/${BUCKET}/${key}`;
}

export async function uploadUserAvatar(
  userId: string,
  buffer: Buffer,
  filename: string,
  contentType = "image/jpeg"
): Promise<string> {
  const client = getClient();
  await ensureBucket();
  const ext = filename.split(".").pop() || "jpg";
  const key = `avatars/${userId}/${Date.now()}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${ENDPOINT}/${BUCKET}/${key}`;
}

/**
 * Extract S3 key from a stored MinIO URL.
 * Handles formats: http://host:port/bucket/key or http://host:port/bucket/key
 */
function extractKeyFromUrl(storedUrl: string): string | null {
  try {
    const u = new URL(storedUrl);
    const path = u.pathname.replace(/^\//, "");
    const bucketPrefix = `${BUCKET}/`;
    if (path.startsWith(bucketPrefix)) {
      return path.slice(bucketPrefix.length);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert a stored MinIO URL to a presigned URL (valid 1 hour).
 * Use when the bucket is private so images load in the browser.
 */
export async function getSignedImageUrl(storedUrl: string): Promise<string> {
  const key = extractKeyFromUrl(storedUrl);
  if (!key) return storedUrl;
  try {
    const client = getClient();
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return await getSignedUrl(client, command, { expiresIn: 3600 });
  } catch {
    return storedUrl;
  }
}
