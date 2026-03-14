import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { SEXTER_SESSION_CREDITS, SEXTER_SESSION_MINUTES } from "@/lib/credits";
import { uploadSexterMedia, getSignedImageUrl } from "@/lib/minio";

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

/** GET: Client only. Most recent sexter session + messages. Post-session teaser from escort is returned with blurredForClient: true so client shows it blurred as bait. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ escortId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const { escortId } = await params;
  const escort = await prisma.escortProfile.findUnique({
    where: { id: escortId, isActive: true },
  });
  if (!escort) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

  const session = await prisma.sexterSession.findFirst({
    where: { clientId: payload.userId, escortId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, role: true } } },
      },
    },
  });

  const escortPhoto = await prisma.escortPhoto.findFirst({
    where: { escortId, isPrimary: true },
    select: { id: true, imageUrl: true },
  });
  const otherName = escort.aliasName;
  const otherPhotoId = escortPhoto?.id ?? null;
  let otherPhotoUrl: string | null = null;
  if (escortPhoto?.imageUrl) {
    try {
      otherPhotoUrl = await getSignedImageUrl(escortPhoto.imageUrl);
    } catch {
      // keep null
    }
  }

  if (!session) {
    return NextResponse.json(
      { session: null, messages: [], canSend: true, expiresAt: null, isExpired: false, otherName, otherPhotoId, otherPhotoUrl },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" } }
    );
  }

  const now = new Date();
  const endedAt = session.endedAt ?? null;
  const sessionEndTime = session.endedAt ?? session.expiresAt;
  const isActive = !endedAt && now <= session.expiresAt;
  const isExpired = !isActive;

  const isSessionEnded = !!endedAt || now > session.expiresAt;
  const messagesForClient = await Promise.all(
    session.messages.map(async (m) => {
      const isPostSessionTeaser =
        isSessionEnded && m.sender.role === "escort" && m.createdAt > sessionEndTime;
      const base = {
        ...m,
        blurredForClient: isPostSessionTeaser as boolean,
      };
      if (!m.attachmentUrl) return base;
      try {
        const signed = await getSignedImageUrl(m.attachmentUrl);
        return { ...base, attachmentUrl: signed };
      } catch {
        return base;
      }
    })
  );

  return NextResponse.json(
    {
      session: { id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, endedAt },
      messages: messagesForClient,
      canSend: isActive ? !isExpired : true,
      expiresAt: session.expiresAt,
      isExpired,
      otherName,
      otherPhotoId,
      otherPhotoUrl,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" } }
  );
}

/** POST: Client only. Send message; use active session, or reopen ended session (keeps history), or create new. Client pays 1 credit to reopen or create. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ escortId: string }> }
) {
  const payload = getUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const { escortId } = await params;
  const escort = await prisma.escortProfile.findUnique({
    where: { id: escortId, isActive: true },
  });
  if (!escort) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

  const clientId = payload.userId;
  let session = await prisma.sexterSession.findFirst({
    where: { clientId, escortId, endedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (session && new Date() > session.expiresAt) {
    return NextResponse.json({ error: "Session expired. Extend to continue." }, { status: 400 });
  }

  if (!session) {
    const clientUser = await prisma.user.findUnique({
      where: { id: clientId },
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
    const lastSession = await prisma.sexterSession.findFirst({
      where: { clientId, escortId },
      orderBy: { createdAt: "desc" },
    });
    const expiresAt = new Date(Date.now() + SEXTER_SESSION_MINUTES * 60 * 1000);
    if (lastSession?.endedAt != null) {
      await prisma.$transaction([
        prisma.sexterSession.update({
          where: { id: lastSession.id },
          data: { endedAt: null, expiresAt },
        }),
        prisma.user.update({
          where: { id: clientId },
          data: { credits: { decrement: SEXTER_SESSION_CREDITS } },
        }),
      ]);
      session = await prisma.sexterSession.findUniqueOrThrow({ where: { id: lastSession.id } });
    } else {
      session = await prisma.sexterSession.create({
        data: { clientId, escortId, expiresAt },
      });
      await prisma.user.update({
        where: { id: clientId },
        data: { credits: { decrement: SEXTER_SESSION_CREDITS } },
      });
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
        return NextResponse.json({ error: "Only images and videos are allowed." }, { status: 400 });
      }
      if (buffer.length > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Maximum 25MB." }, { status: 400 });
      }
      attachmentUrl = await uploadSexterMedia(session.id, payload.userId, buffer, name, type);
      attachmentType = isVideo ? "video" : "image";
    }
  } else {
    const body = await req.json().catch(() => ({}));
    messageText = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  }

  if (!messageText && !attachmentUrl) {
    return NextResponse.json({ error: "Message text or attachment required." }, { status: 400 });
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
