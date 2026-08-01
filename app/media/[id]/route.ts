import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { articles, games, mediaAssets } from "../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; let media: any;
  try { media = (await getDb().select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "approved"))).limit(1))[0]; } catch { return new Response("Not found", { status: 404 }); }
  if (!media?.r2Key) return new Response("Not found", { status: 404 });
  const db = getDb(); const parent = media.articleId ? (await db.select().from(articles).where(and(eq(articles.id, media.articleId), eq(articles.status, "published"))).limit(1))[0] : (await db.select().from(games).where(and(eq(games.id, media.gameId), eq(games.published, true))).limit(1))[0];
  if (!parent) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(media.r2Key); if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("Cache-Control", "public, max-age=86400"); headers.set("X-Content-Type-Options", "nosniff"); headers.set("X-Robots-Tag", "noindex"); return new Response(object.body, { headers });
}
