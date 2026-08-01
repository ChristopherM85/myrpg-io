import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { articles, auditEvents, games, mediaAssets, users } from "../../../../../db/schema";

const MAX_BYTES = 6 * 1024 * 1024;
const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/avif", "avif"]]);
const now = () => new Date().toISOString();
const validPlacement = (articleId: string, placement: string) => articleId ? ["lead", "supporting"].includes(placement) : ["lead", "game-card", "directory-card"].includes(placement);

function hasExpectedSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") return bytes.length > 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return bytes.length > 16 && new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp" && ["avif", "avis"].includes(new TextDecoder().decode(bytes.slice(8, 12)));
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser(); if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });
  const db = getDb(); const account = (await db.select().from(users).where(eq(users.email, identity.email)).limit(1))[0]; if (account?.role !== "owner") return Response.json({ error: "Only the Owner can upload media." }, { status: 403 });
  const form = await request.formData(); const file = form.get("file"); const articleId = String(form.get("articleId") || ""); const gameId = String(form.get("gameId") || ""); const placement = String(form.get("placement") || ""); const altText = String(form.get("altText") || "").trim(); const credit = String(form.get("credit") || "").trim(); const rightsNotes = String(form.get("rightsNotes") || "").trim(); const caption = String(form.get("caption") || "").trim(); const width = Number(form.get("width")); const height = Number(form.get("height"));
  if (!(file instanceof File) || (!articleId && !gameId) || (articleId && gameId) || !altText || !rightsNotes || !validPlacement(articleId, placement) || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) return Response.json({ error: "Choose one record, a valid placement, alt text, rights notes, and valid image dimensions." }, { status: 400 });
  if (!allowed.has(file.type) || file.size < 32 || file.size > MAX_BYTES) return Response.json({ error: "Upload a JPEG, PNG, WebP, or AVIF image up to 6 MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer()); if (!hasExpectedSignature(bytes, file.type)) return Response.json({ error: "The file content does not match the declared image type." }, { status: 400 });
  if (articleId) { const article = (await db.select().from(articles).where(eq(articles.id, articleId)).limit(1))[0]; if (!article) return Response.json({ error: "Article not found." }, { status: 404 }); }
  if (gameId) { const game = (await db.select().from(games).where(eq(games.id, gameId)).limit(1))[0]; if (!game) return Response.json({ error: "Game not found." }, { status: 404 }); }
  const attached = await db.select().from(mediaAssets).where(articleId ? eq(mediaAssets.articleId, articleId) : eq(mediaAssets.gameId, gameId));
  if (placement === "lead" && attached.some((asset) => asset.placement === "lead" && asset.status !== "archived")) return Response.json({ error: "Only one lead visual is allowed per record." }, { status: 409 });
  if (articleId && placement === "supporting" && attached.filter((asset) => asset.placement === "supporting" && asset.status !== "archived").length >= 2) return Response.json({ error: "An article may have up to two supporting visuals." }, { status: 409 });
  const id = crypto.randomUUID(); const extension = allowed.get(file.type)!; const key = `owner/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extension}`; const stamp = now();
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: file.type, cacheControl: "private, no-store" }, customMetadata: { mediaId: id, owner: identity.email } });
  await db.insert(mediaAssets).values({ id, articleId: articleId || null, gameId: gameId || null, assetUrl: `/media/${id}`, r2Key: key, sourceUrl: null, sourceType: "owner_upload", credit: credit || null, rightsNotes, altText, caption: caption || null, width, height, placement, status: "pending_review", createdAt: stamp, updatedAt: stamp });
  await db.insert(auditEvents).values({ id: crypto.randomUUID(), actorEmail: identity.email, action: "media_r2_uploaded", entityType: "media", entityId: id, details: JSON.stringify({ articleId: articleId || null, gameId: gameId || null, placement, r2Key: key, fileType: file.type, bytes: file.size }), createdAt: stamp });
  return Response.json({ ok: true, mediaId: id });
}
