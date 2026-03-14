import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { SEXTER_SESSION_CREDITS, SEXTER_SESSION_MINUTES } from "@/lib/credits";
import { uploadSexterMedia, getSignedImageUrl, deleteSexterSessionMedia } from "@/lib/minio";

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

async function canAccessBooking(bookingId: string, userId: string, role: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { escort: true, client: true },
  });
  if (!booking) return null;
  if (booking.status !== "accepted") return null;
  if (role === "client" && booking.clientId === userId) return booking;
  if (role === "escort" && booking.escort.userId === userId) return booking;
  return null;
}

/** GET: return active sexter session and messages (session-based; empty when no active session). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const booking = await canAccessBooking(bookingId, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const session = await prisma.sexterSession.findFirst({
    where: { bookingId, endedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, role: true } } },
      },
    },
  });

  if (!session) {
    return NextResponse.json(
      { session: null, messages: [], canSend: booking.status === "accepted", expiresAt: null },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  const now = new Date();
  const isExpired = now > session.expiresAt;

  const messagesWithSignedUrls = await Promise.all(
    session.messages.map(async (m) => {
      if (!m.attachmentUrl) return m;
      try {
        const signed = await getSignedImageUrl(m.attachmentUrl);
        return { ...m, attachmentUrl: signed };
      } catch {
        return m;
      }
    })
  );

  return NextResponse.json(
    {
      session: {
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
      messages: messagesWithSignedUrls,
      canSend: booking.status === "accepted" && !isExpired,
      expiresAt: session.expiresAt,
      isExpired,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

/** POST: get or create active session; create sexter message (text and/or media). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getUser(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;
  const booking = await canAccessBooking(bookingId, payload.userId, payload.role);
  if (!booking) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  let session = await prisma.sexterSession.findFirst({
    where: { bookingId, endedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!session && payload.role === "client") {
    const clientUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { credits: true },
    });
    const credits = clientUser?.credits ?? 0;
    if (credits < SEXTER_SESSION_CREDITS) {
      return NextResponse.json(
        {
          error: "Insufficient credits.",
          message: "Your companion sent you a message. Get credits to continue the conversation.",
          code: "NEED_CREDITS",
        },
        { status: 402 }
      );
    }
  }

  const contentType = req.headers.get("content-type") || "";
  let messageText = "";
  let attachmentUrl: string | null = null;
  let attachmentType: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    messageText = (formData.get("message") as string)?.trim() || "";
    const file = formData.get("file") as File | null;
    if (file && file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = file.name || "upload";
      const type = file.type || "application/octet-stream";
      const isImage = type.startsWith("image/");
      const isVideo = type.startsWith("video/");
      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: "Only images and videos are allowed." },
          { status: 400 }
        );
      }
      if (buffer.length > 25 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File too large. Maximum 25MB." },
          { status: 400 }
        );
      }
      if (!session) {
        const expiresAt = new Date(Date.now() + SEXTER_SESSION_MINUTES * 60 * 1000);
        session = await prisma.sexterSession.create({
          data: { bookingId, expiresAt },
        });
        if (payload.role === "client") {
          await prisma.user.update({
            where: { id: payload.userId },
            data: { credits: { decrement: SEXTER_SESSION_CREDITS } },
          });
        }
      } else if (new Date() > session.expiresAt) {
        return NextResponse.json(
          { error: "Session expired. Extend to continue." },
          { status: 400 }
        );
      }
      attachmentUrl = await uploadSexterMedia(session.id, payload.userId, buffer, name, type);
      attachmentType = isVideo ? "video" : "image";
    }
  } else {
    const body = await req.json().catch(() => ({}));
    messageText = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  }

  if (!messageText && !attachmentUrl) {
    return NextResponse.json(
      { error: "Message text or attachment required." },
      { status: 400 }
    );
  }

  if (!session) {
    const expiresAt = new Date(Date.now() + SEXTER_SESSION_MINUTES * 60 * 1000);
    session = await prisma.sexterSession.create({
      data: { bookingId, expiresAt },
    });
    if (payload.role === "client") {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { credits: { decrement: SEXTER_SESSION_CREDITS } },
      });
    }
  } else if (new Date() > session.expiresAt) {
    return NextResponse.json(
      { error: "Session expired. Extend to continue." },
      { status: 400 }
    );
  }

  const msg = await prisma.sexterMessage.create({
    data: {
      sexterSessionId: session.id,
      senderId: payload.userId,
      message: messageText,
      attachmentUrl,
      attachmentType,
    },
    include: { sender: { select: { id: true, role: true } } },
  });

  if (msg.attachmentUrl) {
    try {
      (msg as { attachmentUrl?: string }).attachmentUrl = await getSignedImageUrl(msg.attachmentUrl);
    } catch {
      // keep stored url
    }
  }

  return NextResponse.json(msg);
}
