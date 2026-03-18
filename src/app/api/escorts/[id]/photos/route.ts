import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadPhoto } from "@/lib/minio";
import { requireAnyRole } from "@/lib/auth";
import { requireEscortOwner } from "@/lib/authorization";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireAnyRole(req, ["escort", "admin"]);
  if (payload instanceof NextResponse) return payload;

  const { id: escortId } = await params;
  const escort = await requireEscortOwner(payload, escortId);
  if (escort instanceof NextResponse) return escort;

  const photos = await prisma.escortPhoto.findMany({
    where: { escortId, isApproved: true, allowGallery: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ photos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = requireAnyRole(req, ["escort", "admin"]);
  if (payload instanceof NextResponse) return payload;

  const { id: escortId } = await params;
  const escort = await requireEscortOwner(payload, escortId);
  if (escort instanceof NextResponse) return escort;

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
        isApproved: false,
        reviewStatus: "pending",
        allowGallery: false,
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
