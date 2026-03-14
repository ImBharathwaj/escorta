import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: NextRequest) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (payload.role !== "client") {
    return NextResponse.json(
      { error: "Only client accounts can be deleted from this flow" },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, phone: true, role: true, deletedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.deletedAt) {
    return NextResponse.json({ error: "Account already deleted" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.deletedUserEmail.create({
      data: {
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        email: null,
        phone: null,
        displayName: null,
        avatarUrl: null,
        passwordHash: "",
      },
    });
  });

  return NextResponse.json({ ok: true, message: "Account deleted" });
}
