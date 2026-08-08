import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, gameSubmissions } from "../../../db/schema";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DAILY_SUBMISSION_LIMIT = 3;
const imageTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/avif", "avif"]]);
const allowedLanes = new Set(["mmorpg", "live_service", "online_multiplayer", "single_player", "strategy", "shooter", "survival", "action_rpg", "sports_racing", "indie_casual", "other_digital"]);
const allowedLifecycle = new Set(["released", "early_access", "upcoming", "active_development", "other"]);

const trim = (value: FormDataEntryValue | null, max: number) => String(value || "").trim().slice(0, max);
const normalizeUrl = (value: string) => { const url = new URL(value); if (url.protocol !== "https:") throw new Error("https required"); url.hash = ""; for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key); return url.toString().replace(/\/$/, ""); };
const hasSignature = (bytes: Uint8Array, type: string) => type === "image/jpeg" ? bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : type === "image/png" ? bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 : type === "image/webp" ? bytes.length > 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" : bytes.length > 16 && new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp" && ["avif", "avis"].includes(new TextDecoder().decode(bytes.slice(8, 12)));
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function POST(request: Request) {
  const form = await request.formData();
  if (trim(form.get("website"), 200)) return Response.json({ ok: true }); // Honeypot: silently drop bots.
  const gameName = trim(form.get("gameName"), 120); const studioName = trim(form.get("studioName"), 120); const description = trim(form.get("description"), 1200); const coverageLane = trim(form.get("coverageLane"), 40); const lifecycleStatus = trim(form.get("lifecycleStatus"), 40); const platforms = trim(form.get("platforms"), 220); const submitterNote = trim(form.get("submitterNote"), 700); const imageAltText = trim(form.get("imageAltText"), 220); const rightsConfirmed = form.get("rightsConfirmed") === "on";
  if (!gameName || description.length < 60 || !allowedLanes.has(coverageLane) || (lifecycleStatus && !allowedLifecycle.has(lifecycleStatus))) return Response.json({ error: "Add a game name, a factual 60-character description, and supported category details." }, { status: 400 });
  let officialUrl = ""; let sourceUrl = ""; try { officialUrl = normalizeUrl(trim(form.get("officialUrl"), 500)); const source = trim(form.get("sourceUrl"), 500); sourceUrl = source ? normalizeUrl(source) : ""; } catch { return Response.json({ error: "Use complete HTTPS official website and source URLs." }, { status: 400 }); }
  const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; const day = new Date().toISOString().slice(0, 10); const submitterHash = await hash(`${day}:${clientIp}`); const db = getDb();
  const existing = await db.select({ id: gameSubmissions.id }).from(gameSubmissions).where(eq(gameSubmissions.submitterHash, submitterHash));
  if (existing.length >= DAILY_SUBMISSION_LIMIT) return Response.json({ error: "This connection has reached the three-submission daily limit. Please try again tomorrow." }, { status: 429 });
  const image = form.get("image"); let imageBytes: Uint8Array | null = null; let imageType: string | null = null; let imageWidth: number | null = null; let imageHeight: number | null = null;
  if (image instanceof File && image.size > 0) { if (!rightsConfirmed || !imageAltText) return Response.json({ error: "Confirm image rights and add descriptive alt text before including an image." }, { status: 400 }); if (!imageTypes.has(image.type) || image.size < 32 || image.size > MAX_IMAGE_BYTES) return Response.json({ error: "Optional images must be JPEG, PNG, WebP, or AVIF and no larger than 5 MB." }, { status: 400 }); imageBytes = new Uint8Array(await image.arrayBuffer()); if (!hasSignature(imageBytes, image.type)) return Response.json({ error: "The image contents do not match the declared image type." }, { status: 400 }); imageType = image.type; imageWidth = Number(form.get("imageWidth")); imageHeight = Number(form.get("imageHeight")); if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth < 960 || imageHeight < 540 || imageWidth > 6000 || imageHeight > 6000 || Math.abs(imageWidth / imageHeight - 16 / 9) > 0.18) return Response.json({ error: "Use a landscape image at least 960×540, ideally 1600×900 (16:9)." }, { status: 400 }); }
  const id = crypto.randomUUID(); const createdAt = new Date().toISOString(); const imageR2Key = imageBytes && imageType ? `submissions/${day}/${id}.${imageTypes.get(imageType)}` : null;
  if (imageBytes && imageR2Key && imageType) await env.MEDIA.put(imageR2Key, imageBytes, { httpMetadata: { contentType: imageType, cacheControl: "private, no-store" }, customMetadata: { submissionId: id, visibility: "private_review" } });
  await db.insert(gameSubmissions).values({ id, gameName, studioName: studioName || null, officialUrl, sourceUrl: sourceUrl || null, description, coverageLane, lifecycleStatus: lifecycleStatus || null, platforms: platforms || null, submitterNote: submitterNote || null, imageR2Key, imageContentType: imageType, imageWidth, imageHeight, imageAltText: imageAltText || null, rightsConfirmed, submitterHash, status: "new", createdAt, updatedAt: createdAt });
  await db.insert(auditEvents).values({ id: crypto.randomUUID(), actorEmail: "public-submission", action: "game_submission_received", entityType: "game_submission", entityId: id, details: JSON.stringify({ coverageLane, hasImage: Boolean(imageR2Key), sourceProvided: Boolean(sourceUrl), privateOnly: true, autoPublish: false }), createdAt });
  return Response.json({ ok: true, id });
}
