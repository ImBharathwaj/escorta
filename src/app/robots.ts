import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gallery", "/gallery/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

