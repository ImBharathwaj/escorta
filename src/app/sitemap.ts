import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date() },
    { url: `${baseUrl}/companions`, lastModified: new Date() },
    { url: `${baseUrl}/gallery`, lastModified: new Date() },
  ];

  try {
    const [galleries, escorts, cities] = await Promise.all([
      prisma.gallery.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.escortProfile.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 500,
      }),
      prisma.escortProfile.groupBy({
        by: ["city"],
        where: { isActive: true, city: { not: null } },
      }),
    ]);

    for (const g of galleries) {
      entries.push({ url: `${baseUrl}/gallery/${g.slug}`, lastModified: g.updatedAt });
    }

    for (const e of escorts) {
      entries.push({ url: `${baseUrl}/escorts/${e.id}`, lastModified: e.updatedAt });
    }

    for (const c of cities) {
      if (c.city) {
        entries.push({
          url: `${baseUrl}/companions/${encodeURIComponent(c.city.toLowerCase())}`,
          lastModified: new Date(),
        });
      }
    }

    const services = await prisma.adultService.findMany({ select: { name: true } });
    for (const s of services) {
      entries.push({
        url: `${baseUrl}/services/${encodeURIComponent(s.name.toLowerCase())}`,
        lastModified: new Date(),
      });
    }
  } catch {
    // If DB lookup fails, still return base entries
  }

  return entries;
}

