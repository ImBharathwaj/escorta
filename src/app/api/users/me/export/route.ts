import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { decryptOptional } from "@/lib/fieldEncryption";

/**
 * Download my data (basic JSON export).
 * Note: Intended as a starter export; extend fields as needed.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      role: true,
      email: true,
      phone: true,
      displayName: true,
      avatarUrl: true,
      credits: true,
      createdAt: true,
      updatedAt: true,
      emailVerifiedAt: true,
      preferredLanguages: true,
      orientation: true,
      preferencesNotes: true,
      escortProfile: auth.role === "escort"
        ? {
            select: {
              id: true,
              aliasName: true,
              age: true,
              city: true,
              country: true,
              gender: true,
              description: true,
              isVerified: true,
              isGenderVerified: true,
              isActive: true,
              isPremium: true,
              languages: true,
              photos: {
                select: {
                  id: true,
                  imageUrl: true,
                  isPrimary: true,
                  isApproved: true,
                  allowGallery: true,
                  createdAt: true,
                },
                orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
              },
            },
          }
        : false,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const decryptedUser = {
    ...user,
    preferencesNotes: decryptOptional(user.preferencesNotes),
  };

  const creditTransactions = await prisma.creditTransaction.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      id: true,
      amount: true,
      type: true,
      referenceType: true,
      referenceId: true,
      relatedUserId: true,
      createdAt: true,
    },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      type: true,
      title: true,
      referenceType: true,
      referenceId: true,
      relatedUserId: true,
      readAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user: decryptedUser,
    creditTransactions,
    notifications,
  });
}

