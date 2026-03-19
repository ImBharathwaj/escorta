import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEscort } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = requireEscort(req);
  if (payload instanceof NextResponse) return payload;

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
    include: {
      photos: { where: { isApproved: true }, select: { id: true }, take: 1 },
      services: { select: { serviceId: true }, take: 1 },
    },
  });

  const hasProfile = !!profile;
  const hasAlias = !!(profile?.aliasName);
  const hasAge = !!(profile?.age);
  const hasCity = !!(profile?.city);
  const hasDescription = !!(profile?.description && profile.description.length >= 20);
  const hasPhoto = !!(profile?.photos && profile.photos.length > 0);
  const hasService = !!(profile?.services && profile.services.length > 0);

  const items = [
    { key: "profile", label: "Create your companion profile", done: hasProfile },
    { key: "alias", label: "Add your alias/display name", done: hasAlias },
    { key: "photo", label: "Upload at least one photo (approved)", done: hasPhoto },
    { key: "description", label: "Write a description (20+ characters)", done: hasDescription },
    { key: "age", label: "Add your age", done: hasAge },
    { key: "city", label: "Set your city", done: hasCity },
    { key: "services", label: "Select at least one service you offer", done: hasService },
  ];

  return NextResponse.json({ items });
}
