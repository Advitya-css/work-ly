import { MetadataRoute } from "next";

const BASE = "https://work-ly.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" | "yearly") => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("", 1, "daily"),
    page("/pricing", 0.9, "monthly"),
    page("/about", 0.7, "monthly"),
    page("/contact", 0.6, "yearly"),
    page("/free-grader", 0.7, "monthly"),
    page("/signup", 0.8, "monthly"),
    page("/login", 0.5, "monthly"),
    page("/legal/terms", 0.4, "yearly"),
    page("/legal/refunds", 0.4, "yearly"),
    page("/legal/privacy", 0.4, "yearly"),
  ];
}
