import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { agentRuns, auditEvents, sourceCache, sources, sourceWatchlist, users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

const MAX_PRIMARY_FEEDS = 4;
const MAX_DISCOVERY_FEEDS = 4;
const MAX_PRIMARY_ITEMS = 2;
const MAX_DISCOVERY_ITEMS = 1;
const MAX_FEED_BYTES = 512_000;
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const hash = (value: string) => { let result = 5381; for (let index = 0; index < value.length; index++) result = ((result * 33) ^ value.charCodeAt(index)) >>> 0; return `feed-${result.toString(16)}`; };
const normalize = (value: string) => { const url = new URL(value); url.hash = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key); return url.toString().replace(/\/$/, ""); };
const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, "").trim();
const field = (block: string, name: string) => decode(block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "");
const itemsFromFeed = (xml: string) => [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map((match) => { const block = match[1]; const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || ""; return { title: field(block, "title"), url: field(block, "link") || atomLink || field(block, "id"), sourceDate: field(block, "pubDate") || field(block, "updated") || field(block, "published") }; }).filter((item) => item.title && /^https:\/\//i.test(item.url));

async function readBoundedBody(response: Response) {
  const reader = response.body?.getReader(); if (!reader) throw new Error("Feed response had no body.");
  const chunks: Uint8Array[] = []; let total = 0;
  while (total <= MAX_FEED_BYTES) { const next = await reader.read(); if (next.done) break; total += next.value.byteLength; chunks.push(next.value); }
  if (total > MAX_FEED_BYTES) throw new Error("Feed exceeded the 512 KB safety limit.");
  const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(output);
}

export async function POST() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });
  const db = getDb(); const account = (await db.select().from(users).where(eq(users.email, identity.email)).limit(1))[0];
  if (account?.role !== "owner") return Response.json({ error: "Only the Owner can run configured feeds." }, { status: 403 });
  const [watches, sourceRows] = await Promise.all([db.select().from(sourceWatchlist), db.select().from(sources)]);
  const sourceFor = new Map(sourceRows.map((source) => [source.id, source])); let primary = 0; let discovery = 0; let captured = 0; let leads = 0; let held = 0;
  for (const watch of watches.filter((item) => item.checkMode === "approved_feed" && item.status === "ready")) {
    const source = sourceFor.get(watch.sourceId); const tier = watch.feedTier === "discovery" ? "discovery" : "primary";
    if (!source?.approved || (source.sourceRole || "primary") !== tier || (tier === "primary" && primary >= MAX_PRIMARY_FEEDS) || (tier === "discovery" && discovery >= MAX_DISCOVERY_FEEDS)) continue;
    if (tier === "primary") primary++; else discovery++;
    let config: { feedUrl?: string } = {}; try { config = JSON.parse(watch.note || "{}"); } catch { /* Held below if malformed. */ }
    const timestamp = now();
    try {
      const feedUrl = normalize(config.feedUrl || ""); const host = new URL(feedUrl).hostname.toLowerCase().replace(/^www\./, ""); if (host !== source.domain.toLowerCase().replace(/^www\./, "")) throw new Error("Feed domain does not match its configured source.");
      const response = await fetch(feedUrl, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" } }); const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !/xml|rss|atom/i.test(contentType)) throw new Error(`Feed response was not supported XML (${response.status}).`);
      const limit = tier === "primary" ? MAX_PRIMARY_ITEMS : MAX_DISCOVERY_ITEMS;
      for (const item of itemsFromFeed(await readBoundedBody(response)).slice(0, limit)) {
        const normalizedUrl = normalize(item.url); const itemHost = new URL(normalizedUrl).hostname.toLowerCase().replace(/^www\./, ""); if (itemHost !== host) continue;
        if ((await db.select().from(sourceCache).where(eq(sourceCache.normalizedUrl, normalizedUrl)).limit(1))[0]) continue;
        const output = tier === "primary"
          ? { type: "approved_feed_item", feedTier: "primary", title: item.title, sourceUrl: normalizedUrl, sourceDate: item.sourceDate || null, sourceId: source.id, sourceDomain: source.domain, fetchedAt: timestamp, confidence: item.sourceDate ? "medium" : "low", nextStep: "Owner evidence review required before an AI draft can be prepared." }
          : { type: "editorial_discovery_lead", feedTier: "discovery", title: item.title, sourceUrl: normalizedUrl, sourceDate: item.sourceDate || null, sourceId: source.id, sourceDomain: source.domain, fetchedAt: timestamp, confidence: "lead", discoveryOnly: true, nextStep: "Find and validate a direct approved official source before evidence, drafting, or publication." };
        await db.insert(sourceCache).values({ id: id(), normalizedUrl, contentHash: hash(`${item.title}|${item.sourceDate}|${normalizedUrl}`), sourceId: source.id, lastCheckedAt: timestamp, createdAt: timestamp, updatedAt: timestamp });
        await db.insert(agentRuns).values({ id: id(), agent: "scout", status: tier === "primary" ? "evidence_ready" : "verification_lead", itemId: `feed:manual:${hash(normalizedUrl)}`, plannedCostCents: 0, actualCostCents: 0, outputJson: JSON.stringify(output), createdAt: timestamp, updatedAt: timestamp });
        await db.insert(auditEvents).values({ id: id(), actorEmail: identity.email, action: tier === "primary" ? "approved_feed_item_captured" : "editorial_feed_lead_captured", entityType: "source_feed", entityId: watch.id, details: JSON.stringify({ manual: true, feedTier: tier, normalizedUrl, privateOnly: true, noPublish: true, noDraft: tier === "discovery" }), createdAt: timestamp });
        if (tier === "primary") captured++; else leads++;
      }
      await db.update(sourceWatchlist).set({ lastCheckedAt: timestamp, updatedAt: timestamp }).where(eq(sourceWatchlist.id, watch.id));
    } catch (error) {
      held++; await db.update(sourceWatchlist).set({ status: "hold", updatedAt: timestamp }).where(eq(sourceWatchlist.id, watch.id));
      await db.insert(auditEvents).values({ id: id(), actorEmail: identity.email, action: "source_feed_held", entityType: "source_feed", entityId: watch.id, details: JSON.stringify({ manual: true, reason: error instanceof Error ? error.message : "Unknown error", privateOnly: true }), createdAt: timestamp });
    }
  }
  await db.insert(auditEvents).values({ id: id(), actorEmail: identity.email, action: "tiered_feed_manual_run", entityType: "source_feed", entityId: "configured", details: JSON.stringify({ captured, leads, held, privateOnly: true, autoPublish: false }), createdAt: now() });
  return Response.json({ ok: true, captured, leads, held });
}
