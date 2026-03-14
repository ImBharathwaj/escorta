import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { uploadUserAvatar } from "@/lib/minio";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar") as File | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded. Use field name 'avatar'." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || "avatar.jpg";
  const contentType = file.type || "image/jpeg";

  if (buffer.length > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum 2MB." },
      { status: 400 }
    );
  }

  try {
    const avatarUrl = await uploadUserAvatar(
      payload.userId,
      buffer,
      filename,
      contentType
    );
    await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl },
    });
    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check storage connection." },
      { status: 503 }
    );
  }
}
