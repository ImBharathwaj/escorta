import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
    },
  ];

  try {
    const galleries = await prisma.gallery.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    for (const g of galleries) {
      entries.push({
        url: `${baseUrl}/gallery/${g.slug}`,
        lastModified: g.updatedAt,
      });
    }
  } catch {
    // If DB lookup fails, still return base entries
  }

  return entries;
}

