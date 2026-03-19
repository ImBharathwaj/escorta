import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/companions", "/companions/", "/gallery", "/gallery/", "/escorts/", "/services/", "/terms", "/privacy", "/guidelines"],
        disallow: ["/api/", "/admin/", "/dashboard/", "/login", "/register", "/onboarding", "/settings", "/video-call/", "/live/go", "/sexter/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

