/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController { scheduledTime: number; cron: string; }

const DAILY_DESKS = [
  ["signal", "Maya Chen — Signal Desk"],
  ["systems", "Marcus Vale — Systems Desk"],
  ["world_atlas", "Elena Rossi — World Atlas Desk"],
  ["archive", "Theo Grant — Archive Desk"],
] as const;

const iso = () => new Date().toISOString();
const runDate = (time: number) => new Date(time).toISOString().slice(0, 10);
const MAX_DAILY_FEEDS = 4;
const MAX_ITEMS_PER_FEED = 2;
const MAX_FEED_BYTES = 512_000;

const normalizeFeedUrl = (value: string) => {
  const url = new URL(value); url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, "");
};
const decodeXml = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, "").trim();
const xmlField = (block: string, field: string) => decodeXml(block.match(new RegExp(`<${field}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${field}>`, "i"))?.[1] || "");
const feedItems = (xml: string) => {
  const blocks = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map((match) => match[1]);
  return blocks.map((block) => {
    const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    return { title: xmlField(block, "title"), url: xmlField(block, "link") || atomLink || xmlField(block, "id"), sourceDate: xmlField(block, "pubDate") || xmlField(block, "updated") || xmlField(block, "published") };
  }).filter((item) => item.title && /^https:\/\//i.test(item.url)).slice(0, MAX_ITEMS_PER_FEED);
};
const hash = (value: string) => { let result = 5381; for (let index = 0; index < value.length; index++) result = ((result * 33) ^ value.charCodeAt(index)) >>> 0; return `feed-${result.toString(16)}`; };

async function collectApprovedFeeds(env: Env, scheduledTime: number) {
  const now = iso(); const date = runDate(scheduledTime);
  const rows = await env.DB.prepare("SELECT w.id AS watch_id, w.source_id AS source_id, w.note AS note, s.domain AS domain FROM source_watchlist w JOIN sources s ON s.id = w.source_id WHERE w.check_mode = 'approved_feed' AND w.status = 'ready' AND s.approved = 1 ORDER BY w.updated_at LIMIT ?1").bind(MAX_DAILY_FEEDS).all<{ watch_id: string; source_id: string; note: string | null; domain: string }>();
  for (const row of rows.results || []) {
    let config: { feedUrl?: string } = {}; try { config = JSON.parse(row.note || "{}"); } catch { /* Invalid private configuration is held rather than fetched. */ }
    if (!config.feedUrl) continue;
    let feedUrl = ""; try { feedUrl = normalizeFeedUrl(config.feedUrl); const host = new URL(feedUrl).hostname.toLowerCase().replace(/^www\./, ""); if (host !== row.domain.toLowerCase().replace(/^www\./, "")) throw new Error("domain mismatch"); } catch { continue; }
    try {
      const response = await fetch(feedUrl, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" } });
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !/xml|rss|atom/i.test(contentType)) throw new Error(`Feed response was not a supported XML feed (${response.status}).`);
      const reader = response.body?.getReader(); if (!reader) throw new Error("Feed response had no body.");
      const chunks: Uint8Array[] = []; let total = 0;
      while (total <= MAX_FEED_BYTES) { const next = await reader.read(); if (next.done) break; total += next.value.byteLength; chunks.push(next.value); }
      if (total > MAX_FEED_BYTES) throw new Error("Feed exceeded the 512 KB safety limit.");
      const xml = new TextDecoder().decode(concat(chunks, total));
      for (const item of feedItems(xml)) {
        let normalized = ""; try { normalized = normalizeFeedUrl(item.url); const host = new URL(normalized).hostname.toLowerCase().replace(/^www\./, ""); if (host !== row.domain.toLowerCase().replace(/^www\./, "")) continue; } catch { continue; }
        const existing = await env.DB.prepare("SELECT id FROM source_cache WHERE normalized_url = ?1 LIMIT 1").bind(normalized).first<{ id: string }>();
        if (existing) continue;
        const cacheId = crypto.randomUUID(); const itemId = `feed:${date}:${hash(normalized)}`;
        const evidence = { type: "approved_feed_item", title: item.title, sourceUrl: normalized, sourceDate: item.sourceDate || null, sourceId: row.source_id, sourceDomain: row.domain, fetchedAt: now, confidence: item.sourceDate ? "medium" : "low", nextStep: "Owner evidence review required before an AI draft can be prepared." };
        await env.DB.batch([
          env.DB.prepare("INSERT INTO source_cache (id,normalized_url,content_hash,source_id,last_checked_at,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?5,?5)").bind(cacheId, normalized, hash(`${item.title}|${item.sourceDate}|${normalized}`), row.source_id, now),
          env.DB.prepare("INSERT INTO agent_runs (id,agent,status,item_id,planned_cost_cents,actual_cost_cents,output_json,stopped_reason,created_at,updated_at) VALUES (?1,'scout','evidence_ready',?2,0,0,?3,NULL,?4,?4)").bind(crypto.randomUUID(), itemId, JSON.stringify(evidence), now),
          env.DB.prepare("INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id,details,created_at) VALUES (?1,'system@myrpg.io','approved_feed_item_captured','source_feed',?2,?3,?4)").bind(crypto.randomUUID(), row.watch_id, JSON.stringify({ date, sourceId: row.source_id, normalizedUrl: normalized, privateOnly: true, noPublish: true }), now),
        ]);
      }
      await env.DB.prepare("UPDATE source_watchlist SET last_checked_at = ?1, updated_at = ?1 WHERE id = ?2").bind(now, row.watch_id).run();
    } catch (error) {
      await env.DB.prepare("UPDATE source_watchlist SET status = 'hold', note = ?1, updated_at = ?2 WHERE id = ?3").bind(JSON.stringify({ feedUrl, error: error instanceof Error ? error.message : "Unknown feed error", heldAt: now }), now, row.watch_id).run();
      await env.DB.prepare("INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id,details,created_at) VALUES (?1,'system@myrpg.io','approved_feed_held','source_feed',?2,?3,?4)").bind(crypto.randomUUID(), row.watch_id, JSON.stringify({ date, reason: error instanceof Error ? error.message : "Unknown feed error" }), now).run();
    }
  }
}

function concat(chunks: Uint8Array[], length: number) { const output = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } return output; }

async function guardedDailyEditorialRun(env: Env, scheduledTime: number) {
  const now = iso(); const date = runDate(scheduledTime);
  const policy = await env.DB.prepare("SELECT daily_limit_cents AS dailyCap, per_job_limit_cents AS perJobCap, live_agents_enabled AS liveEnabled, emergency_stop AS emergencyStop FROM budget_policies ORDER BY created_at LIMIT 1").first<{ dailyCap: number; perJobCap: number; liveEnabled: number; emergencyStop: number }>();
  if (policy?.emergencyStop) return;
  const existing = await env.DB.prepare("SELECT id FROM agent_runs WHERE item_id = ?1 LIMIT 1").bind(`daily:${date}:signal`).first<{ id: string }>();
  if (existing) return;
  const blocker = "No validated, approved-source evidence packet is queued for this desk. No model call or draft was created.";
  const dailyCap = Math.min(Math.max(0, policy?.dailyCap ?? 1000), 1000);
  const perSlotCap = Math.min(Math.max(0, policy?.perJobCap ?? 250), 250, Math.floor(dailyCap / DAILY_DESKS.length));
  await env.DB.batch([
    ...DAILY_DESKS.map(([desk, writer]) => env.DB.prepare("INSERT INTO agent_runs (id,agent,status,item_id,planned_cost_cents,actual_cost_cents,output_json,stopped_reason,created_at,updated_at) VALUES (?1,'editor','blocked',?2,0,0,?3,?4,?5,?5)").bind(crypto.randomUUID(), `daily:${date}:${desk}`, JSON.stringify({ writer, desk, date, dailyCapCents: dailyCap, perSlotCapCents: perSlotCap, privateOnly: true, noPublish: true, noModelCall: true }), blocker, now)),
    env.DB.prepare("INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id,details,created_at) VALUES (?1,'system@myrpg.io','daily_editorial_source_gate','daily_editorial_run',?2,?3,?4)").bind(crypto.randomUUID(), date, JSON.stringify({ date, capCents: dailyCap, perSlotCapCents: perSlotCap, slots: 4, noPublish: true, noModelCall: true }), now),
  ]);
}

function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return secured;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(response);
    }

    return withSecurityHeaders(await handler.fetch(request, env, ctx));
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => { await collectApprovedFeeds(env, controller.scheduledTime); await guardedDailyEditorialRun(env, controller.scheduledTime); })());
  },
};

export default worker;
