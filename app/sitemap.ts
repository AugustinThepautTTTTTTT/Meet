import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "meet-sooty-nu.vercel.app"}`;
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/lawyer/account`, changeFrequency: "monthly", priority: .5 },
  ];
}
