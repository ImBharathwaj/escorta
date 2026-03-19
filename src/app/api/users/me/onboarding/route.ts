import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const payload = requireAuth(req);
  if (payload instanceof NextResponse) return payload;

  const body = await req.json().catch(() => ({}));
  const { city, languages, meetupTypes } = body;

  const data: Record<string, unknown> = { onboardingComplete: true };

  if (typeof city === "string" && city.trim()) {
    data.preferredCity = city.trim();
  }

  if (Array.isArray(languages) && languages.length > 0) {
    data.preferredLanguages = languages
      .filter((l: unknown) => typeof l === "string" && l.trim())
      .map((l: string) => l.trim());
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data,
  });

  if (Array.isArray(meetupTypes) && meetupTypes.length > 0) {
    const names = meetupTypes
      .filter((n: unknown) => typeof n === "string" && n.trim())
      .map((n: string) => n.trim());

    const services = await Promise.all(
      names.map((name) =>
        prisma.adultService.upsert({ where: { name }, update: {}, create: { name } })
      )
    );

    await prisma.clientAdultService.deleteMany({ where: { userId: payload.userId } });
    if (services.length > 0) {
      await prisma.clientAdultService.createMany({
        data: services.map((s) => ({
          userId: payload.userId,
          adultServiceId: s.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
