import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { articles, games } from "../db/schema";

const base = "https://myrpg.io";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date();
  const staticPaths = ["", "/news", "/games", "/find-my-mmo", "/calendar", "/writers", "/editorial-standards", "/ai-transparency", "/advertising-disclosure", "/network/mymafia", "/privacy"];
  const makeStatic = (paths: string[]) => paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: updated,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/find-my-mmo" || path === "/mmo-radar" || path === "/official-updates" ? .8 : .7,
  }));

  try {
    const db = getDb();
    const [publishedArticles, publishedGames] = await Promise.all([
      db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt)),
      db.select().from(games).where(eq(games.published, true)).orderBy(desc(games.updatedAt)),
    ]);
    return [
      ...makeStatic([...staticPaths, ...(publishedGames.length ? ["/mmo-radar"] : []), ...(publishedArticles.length ? ["/official-updates"] : [])]),
      ...publishedArticles.map((article) => ({ url: `${base}/articles/${article.slug}`, lastModified: new Date(article.updatedAt), changeFrequency: "weekly" as const, priority: .8 })),
      ...publishedGames.map((game) => ({ url: `${base}/games/${game.slug}`, lastModified: new Date(game.updatedAt), changeFrequency: "monthly" as const, priority: .7 })),
    ];
  } catch {
    return makeStatic(staticPaths);
  }
}
