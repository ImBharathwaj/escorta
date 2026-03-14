import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { uploadPhoto } from "@/lib/minio";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function getUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: escortId } = await params;

  const escort = await prisma.escortProfile.findUnique({
    where: { id: escortId },
  });

  if (!escort) {
    return NextResponse.json({ error: "Companion not found" }, { status: 404 });
  }
  if (escort.userId !== payload.userId && payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded. Use field name 'photo'." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || "photo.jpg";
  const contentType = file.type || "image/jpeg";

  if (buffer.length > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum 5MB." },
      { status: 400 }
    );
  }

  try {
    const imageUrl = await uploadPhoto(escortId, buffer, filename, contentType);
    const isPrimary = formData.get("is_primary") === "true";

    const photo = await prisma.escortPhoto.create({
      data: {
        escortId,
        imageUrl,
        isPrimary,
        isApproved: true,
      },
    });

    return NextResponse.json(photo);
  } catch (err) {
    console.error("MinIO upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check MinIO connection." },
      { status: 503 }
    );
  }
}
