import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { articles } from "../../db/schema";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";
const cdata = (value: string) => value.replace(/]]>/g, "]]]]><![CDATA[>");

export async function GET() {
  try {
    const rows = await getDb().select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt)).limit(50);
    const items = rows.map((article) => { const url = `${base}/articles/${article.slug}`; return `<item><title><![CDATA[${cdata(article.title)}]]></title><link>${url}</link><guid isPermaLink="true">${url}</guid><description><![CDATA[${cdata(article.summary)}]]></description><source url="${article.sourceUrl}">Official source</source><pubDate>${new Date(article.publishedAt || article.createdAt).toUTCString()}</pubDate></item>`; }).join("");
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>MyRPG.IO News</title><link>${base}</link><description>Source-linked, AI-assisted and human-reviewed MMORPG news.</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`, { headers: { "content-type": "application/rss+xml; charset=utf-8", "X-Robots-Tag": "index, follow" } });
  } catch {
    return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><title>MyRPG.IO News</title></channel></rss>", { headers: { "content-type": "application/rss+xml; charset=utf-8", "X-Robots-Tag": "index, follow" } });
  }
}
