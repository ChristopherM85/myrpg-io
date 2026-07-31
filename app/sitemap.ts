import type { MetadataRoute } from "next";
const base = "https://myrpg-intelligence.cruesink983630.chatgpt.site";
export default function sitemap(): MetadataRoute.Sitemap { const updated = new Date(); return ["", "/news", "/games", "/calendar", "/writers", "/editorial-standards", "/ai-transparency", "/advertising-disclosure", "/privacy"].map((path) => ({ url: `${base}${path}`, lastModified: updated, changeFrequency: "weekly", priority: path === "" ? 1 : .7 })); }
