import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { agentRuns, auditEvents, sourceVerificationPackets, sources, users } from "../../../../db/schema";
import { and, eq } from "drizzle-orm";

const MAX_PAGE_BYTES = 256_000;
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const normalize = (value: string) => { const url = new URL(value); if (url.protocol !== "https:") throw new Error("Only HTTPS official announcement URLs are allowed."); url.hash = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key); return url.toString().replace(/\/$/, ""); };
const host = (value: string) => new URL(value).hostname.toLowerCase().replace(/^www\./, "");
const htmlText = (value: string) => value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const decode = (value: string) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const meta = (html: string, keys: string[]) => { for (const key of keys) { const match = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([^"']+)["']`, "i")) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i")); if (match?.[1]) return decode(match[1].trim()); } return ""; };
async function readBounded(response: Response) { const reader = response.body?.getReader(); if (!reader) throw new Error("Official page returned no readable body."); const chunks: Uint8Array[] = []; let total = 0; while (total <= MAX_PAGE_BYTES) { const next = await reader.read(); if (next.done) break; total += next.value.byteLength; chunks.push(next.value); } if (total > MAX_PAGE_BYTES) throw new Error("Official page exceeded the 256 KB review limit."); const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; } return new TextDecoder().decode(output); }

export async function POST(request: Request) {
  const identity = await getChatGPTUser(); if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });
  const db = getDb(); const account = (await db.select().from(users).where(eq(users.email, identity.email)).limit(1))[0];
  if (account?.role !== "owner") return Response.json({ error: "Only the Owner can verify a discovery lead." }, { status: 403 });
  const body = await request.json().catch(() => ({})); const leadRunId = String(body.leadRunId || ""); const requestedUrl = String(body.officialUrl || "");
  if (!leadRunId) return Response.json({ error: "Choose a private discovery lead first." }, { status: 400 });
  const lead = (await db.select().from(agentRuns).where(and(eq(agentRuns.id, leadRunId), eq(agentRuns.status, "verification_lead"))).limit(1))[0];
  if (!lead) return Response.json({ error: "That private discovery lead is unavailable." }, { status: 404 });
  if (body.action === "hold") {
    const timestamp = now(); await db.update(agentRuns).set({ stoppedReason: "Owner kept this discovery lead private pending a direct official source.", updatedAt: timestamp }).where(eq(agentRuns.id, lead.id));
    await db.insert(auditEvents).values({ id: id(), actorEmail: identity.email, action: "discovery_lead_held", entityType: "source_verification", entityId: lead.id, details: JSON.stringify({ privateOnly: true, reason: "Owner deferred official-source verification." }), createdAt: timestamp });
    return Response.json({ ok: true });
  }
  if (!requestedUrl) return Response.json({ error: "Paste one direct official announcement URL to verify this lead." }, { status: 400 });
  const alreadyVerified = (await db.select().from(sourceVerificationPackets).where(eq(sourceVerificationPackets.leadRunId, lead.id)).limit(1))[0];
  if (alreadyVerified) return Response.json({ error: "This discovery lead already has a private official evidence packet." }, { status: 409 });
  let normalizedUrl = ""; try { normalizedUrl = normalize(requestedUrl); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid official URL." }, { status: 400 }); }
  const path = new URL(normalizedUrl).pathname.toLowerCase(); if (path === "/" || /(?:^|\/)(?:feed|rss|tag|category)(?:\/|$)|\.xml$/i.test(path)) return Response.json({ error: "Use one direct official announcement page, not a homepage, listing, or feed." }, { status: 400 });
  const officialSource = (await db.select().from(sources).where(eq(sources.domain, host(normalizedUrl))).limit(1))[0];
  if (!officialSource?.approved || (officialSource.sourceRole || "primary") !== "primary") return Response.json({ error: "The URL must be on an approved primary official source domain." }, { status: 409 });
  const duplicate = (await db.select().from(sourceVerificationPackets).where(eq(sourceVerificationPackets.normalizedUrl, normalizedUrl)).limit(1))[0];
  if (duplicate) return Response.json({ error: "That official announcement already has a private verification packet." }, { status: 409 });
  const timestamp = now();
  try {
    const response = await fetch(normalizedUrl, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": "MyRPG-Official-Source-Review/1.0 (+https://myrpg.io/editorial-standards)" }, redirect: "follow", signal: AbortSignal.timeout(12_000) });
    const contentType = response.headers.get("content-type") || ""; if (!response.ok || !/html|xhtml/i.test(contentType)) throw new Error(`Official announcement response was not supported HTML (${response.status}).`);
    const html = await readBounded(response); const title = meta(html, ["og:title", "twitter:title"]) || decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "");
    const summary = meta(html, ["description", "og:description", "twitter:description"]).slice(0, 420); const sourceDate = meta(html, ["article:published_time", "date", "datePublished"]) || html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] || null;
    if (!title || !summary) throw new Error("The direct official page did not expose a usable title and factual description for private verification.");
    let leadOutput: any = {}; try { leadOutput = JSON.parse(lead.outputJson || "{}"); } catch { /* Stored lead remains usable without optional title context. */ }
    const pageText = htmlText(html).slice(0, 700); const evidence = { type: "official_source_verification", privateOnly: true, noDraft: true, noPublish: true, discoveryLead: { id: lead.id, title: leadOutput.title || "Untitled discovery lead", sourceUrl: leadOutput.sourceUrl || null, sourceDate: leadOutput.sourceDate || null }, officialAnnouncement: { title, normalizedUrl, sourceDomain: officialSource.domain, sourceDate, summary, factualExcerpt: pageText, fetchedAt: timestamp }, supported: { title, source_url: normalizedUrl, source_date: sourceDate || "Not visibly stated" }, unsupported: ["No taxonomy, article, calendar, or public claim is created from this verification packet."], duplicateResult: "clear", nextStep: "Owner may use this direct official evidence in a separate source-first intake workflow." };
    const packetId = id(); await db.insert(sourceVerificationPackets).values({ id: packetId, leadRunId: lead.id, sourceId: officialSource.id, normalizedUrl, sourceDate, evidenceJson: JSON.stringify(evidence), confidence: sourceDate ? "high" : "medium", status: "private_review", checkedAt: timestamp, createdAt: timestamp, updatedAt: timestamp });
    await db.insert(auditEvents).values({ id: id(), actorEmail: identity.email, action: "discovery_lead_official_source_verified", entityType: "source_verification", entityId: packetId, details: JSON.stringify({ leadRunId: lead.id, sourceId: officialSource.id, normalizedUrl, privateOnly: true, noDraft: true, noPublish: true }), createdAt: timestamp });
    return Response.json({ ok: true, packetId });
  } catch (error) {
    await db.insert(auditEvents).values({ id: id(), actorEmail: identity.email, action: "discovery_lead_verification_held", entityType: "source_verification", entityId: lead.id, details: JSON.stringify({ requestedUrl: normalizedUrl, reason: error instanceof Error ? error.message : "Unknown error", privateOnly: true }), createdAt: timestamp });
    return Response.json({ error: error instanceof Error ? error.message : "Official verification was held." }, { status: 409 });
  }
}
