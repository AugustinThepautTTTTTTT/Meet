import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "meet-sooty-nu.vercel.app"}`;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/client/", "/lawyer/dashboard", "/matters/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
