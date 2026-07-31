import { getDb } from "../../db";
import { articles } from "../../db/schema";
import { eq } from "drizzle-orm";
export const dynamic="force-dynamic";
export async function GET(){try{const rows=await getDb().select().from(articles).where(eq(articles.status,"published")).limit(50);const items=rows.map(a=>`<item><title><![CDATA[${a.title}]]></title><link>https://myrpg.io/articles/${a.slug}</link><description><![CDATA[${a.summary}]]></description><pubDate>${new Date(a.publishedAt||a.createdAt).toUTCString()}</pubDate></item>`).join("");return new Response(`<?xml version="1.0"?><rss version="2.0"><channel><title>MyRPG.IO News</title><link>https://myrpg.io</link><description>AI-assisted, human-reviewed MMORPG news.</description>${items}</channel></rss>`,{headers:{"content-type":"application/rss+xml"}})}catch{return new Response("<?xml version=\"1.0\"?><rss version=\"2.0\"><channel><title>MyRPG.IO News</title></channel></rss>",{headers:{"content-type":"application/rss+xml"}})}}
