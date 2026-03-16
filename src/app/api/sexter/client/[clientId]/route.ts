import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadSexterMedia, getSignedImageUrl } from "@/lib/minio";
import { requireAuth } from "@/lib/auth";

/** GET: Escort only. Active sexter session + messages for this escort + client (standalone). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;
  if (payload.role !== "escort") return NextResponse.json({ error: "Escorts only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { clientId } = await params;
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "Client id required" }, { status: 400 });
  }
  const session = await prisma.sexterSession.findFirst({
    where: { clientId, escortId: profile.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, role: true } } },
      },
    },
  });

  const clientUser = await prisma.user.findUnique({
    where: { id: clientId },
    select: { displayName: true, email: true, avatarUrl: true },
  });
  const otherName = clientUser?.displayName || clientUser?.email || "Member";
  let otherImageUrl: string | null = clientUser?.avatarUrl ?? null;
  if (otherImageUrl) {
    try {
      otherImageUrl = await getSignedImageUrl(otherImageUrl);
    } catch {
      otherImageUrl = null;
    }
  }

  if (!session) {
    return NextResponse.json(
      { session: null, messages: [], tips: [], canSend: false, expiresAt: null, isExpired: false, otherName, otherImageUrl },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" } }
    );
  }

  const now = new Date();
  const isActive = !session.endedAt && now <= session.expiresAt;
  const isEnded = !!session.endedAt || now > session.expiresAt;
  const sessionEndTime = session.endedAt ?? session.expiresAt;
  let canSend = isActive;
  if (!canSend && isEnded) {
    const postSessionCount = await prisma.sexterMessage.count({
      where: {
        sexterSessionId: session.id,
        senderId: profile.userId,
        createdAt: { gt: sessionEndTime },
      },
    });
    canSend = postSessionCount < 1;
  }
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

  const tipTxns = await prisma.creditTransaction.findMany({
    where: {
      userId: profile.userId,
      type: "tip_earned",
      referenceType: "sexter_session",
      referenceId: session.id,
    },
    orderBy: { createdAt: "asc" },
    include: { relatedUser: { select: { displayName: true, email: true } } },
  });
  const tips = tipTxns.map((t) => ({
    id: t.id,
    amount: t.amount,
    clientName: t.relatedUser?.displayName?.trim() || t.relatedUser?.email || "A member",
    createdAt: t.createdAt.toISOString(),
  }));

  return NextResponse.json(
    {
      session: { id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, endedAt: session.endedAt },
      messages: messagesWithSignedUrls,
      tips,
      canSend,
      expiresAt: session.expiresAt,
      isExpired: !isActive,
      otherName,
      otherImageUrl,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" } }
  );
}

/** POST: Escort only. Send message in existing session (client starts session). After session ends, escort can send only one teaser message (text, image, or video). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;
  if (payload.role !== "escort") return NextResponse.json({ error: "Escorts only" }, { status: 403 });

  const profile = await prisma.escortProfile.findUnique({
    where: { userId: payload.userId },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { clientId } = await params;
  // Block checks for escort-initiated sexter.
  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: payload.userId, blockedId: clientId },
        { blockerId: clientId, blockedId: payload.userId },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "Messaging is disabled between you and this user." }, { status: 403 });
  }
  const session = await prisma.sexterSession.findFirst({
    where: { clientId, escortId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json({ error: "No session. Client starts the session." }, { status: 400 });
  }

  const now = new Date();
  const isActive = !session.endedAt && now <= session.expiresAt;
  const sessionEndTime = session.endedAt ?? session.expiresAt;
  const isEnded = !!session.endedAt || now > session.expiresAt;

  if (isEnded) {
    const postSessionCount = await prisma.sexterMessage.count({
      where: {
        sexterSessionId: session.id,
        senderId: payload.userId,
        createdAt: { gt: sessionEndTime },
      },
    });
    if (postSessionCount >= 1) {
      return NextResponse.json(
        { error: "You can only send one message after the session ends." },
        { status: 400 }
      );
    }
  } else if (!isActive) {
    return NextResponse.json({ error: "Session expired. Client can extend." }, { status: 400 });
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
