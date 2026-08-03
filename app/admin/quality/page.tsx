import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { agentRuns, articles, calendarItems, gameTimelineEvents, games, mediaAssets, publicCorrections, sourceCache, sources, users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const normalized = (value?: string | null) => { try { const url = new URL(value || ""); url.hash = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key); return url.toString().replace(/\/$/, ""); } catch { return ""; } };
const calendarFingerprint = (gameId: string, dateLabel: string, sourceUrl: string) => `${gameId}|${dateLabel.trim().toLowerCase()}|${sourceUrl}`;

export default async function QualityPage() {
  const user = await requireChatGPTUser("/admin/quality");
  const issues: string[] = [];
  const visualCoverage: string[] = [];
  const technical = ["Robots policy protects /admin, /api, /preview, and /search.", "Drafts, previews, review packets, filters, and parameterized comparison pages are noindex through their route metadata.", "Published-only sitemap and RSS templates do not include private editorial records."];
  try {
    const db = getDb();
    const me = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (me?.role !== "owner") return <main><h1>Owner access required</h1></main>;
    const publishedArticles = await db.select().from(articles).where(eq(articles.status, "published"));
    const articleRuns = await db.select().from(agentRuns);
    const publishedGameSlugs = new Set((await db.select().from(games).where(eq(games.published, true))).map((game) => game.slug));
    const approvedDomains = new Set((await db.select().from(sources)).filter((source) => source.approved).map((source) => source.domain.toLowerCase()));
    const articleSlugs = new Set<string>();
    for (const article of publishedArticles) {
      if (!article.title.trim()) issues.push(`${article.id}: missing title`);
      if (!article.summary.trim()) issues.push(`${article.id}: missing description`);
      if (!article.sourceUrl) issues.push(`${article.id}: missing citation`);
      if (!article.factCheckedAt) issues.push(`${article.id}: missing fact-check date`);
      if (article.factCheckedAt && Date.now() - Date.parse(article.factCheckedAt) > 1000 * 60 * 60 * 24 * 180) issues.push(`${article.id}: fact check is older than 180 days`);
      if (article.sourceUrl) { try { const domain = new URL(article.sourceUrl).hostname.toLowerCase().replace(/^www\./, ""); if (!approvedDomains.has(domain)) issues.push(`${article.id}: source domain is not approved`); } catch { issues.push(`${article.id}: source URL is invalid`); } }
      if (!article.contentFingerprint || !(await db.select().from(sourceCache).where(eq(sourceCache.contentHash, article.contentFingerprint)).limit(1))[0]) issues.push(`${article.id}: duplicate-check record is missing`);
      const intake = articleRuns.filter((run) => run.itemId === article.id && run.outputJson).map((run) => { try { return JSON.parse(run.outputJson!); } catch { return null; } }).find(Boolean);
      if (!intake?.sourceDate) issues.push(`${article.id}: Official Updates source date is missing`);
      if (!intake?.gamerTakeaway) issues.push(`${article.id}: Official Updates gamer takeaway is missing`);
      if (!article.summary.trim()) issues.push(`${article.id}: visible gamer takeaway is missing`);
      if (intake?.gameSlug && !publishedGameSlugs.has(intake.gameSlug)) issues.push(`${article.id}: related published game is missing`);
      if (articleSlugs.has(article.slug)) issues.push(`${article.id}: duplicate slug`);
      articleSlugs.add(article.slug);
    }
    technical.unshift(`${publishedArticles.length} published article route${publishedArticles.length === 1 ? "" : "s"} are eligible for sitemap and RSS output.`);
    const gameSlugs = new Set<string>(); const gameSourceUrls = new Map<string, string>(); const allGames = await db.select().from(games);
    const timelineRows = await db.select().from(gameTimelineEvents); const timelineFingerprints = new Set<string>();
    for (const event of timelineRows) { const prefix = `timeline ${event.title}`; if (timelineFingerprints.has(event.fingerprint)) issues.push(`${prefix}: duplicate fingerprint`); timelineFingerprints.add(event.fingerprint); if (!event.factCheckedAt) issues.push(`${prefix}: missing fact-check date`); if (!event.eventDate || !["confirmed","estimated","unconfirmed"].includes(event.dateConfidence)) issues.push(`${prefix}: unsupported event date or confidence`); try { if (!approvedDomains.has(new URL(event.sourceUrl).hostname.toLowerCase().replace(/^www\./,""))) issues.push(`${prefix}: source domain is not approved`); } catch { issues.push(`${prefix}: source URL is invalid`); } if (event.articleId && !(await db.select().from(articles).where(eq(articles.id,event.articleId)).limit(1))[0]) issues.push(`${prefix}: broken article relationship`); if (event.calendarItemId && !(await db.select().from(calendarItems).where(eq(calendarItems.id,event.calendarItemId)).limit(1))[0]) issues.push(`${prefix}: broken calendar relationship`); }
    for (const game of allGames) {
      const prefix = game.published ? game.name : `${game.name} (review candidate)`;
      if (game.published && !game.status) issues.push(`${prefix}: MMO Radar status is missing`);
      if (game.published && !game.platforms) issues.push(`${prefix}: MMO Radar platform field is missing`);
      if (game.published && !game.releaseDateConfidence) issues.push(`${prefix}: MMO Radar release confidence is missing`);
      if (!game.activity) issues.push(`${prefix}: Find My MMO activity fit is missing`);
      if (!game.timeCommitment) issues.push(`${prefix}: Find My MMO time commitment is missing`);
      if (!game.directorySummary) issues.push(`${prefix}: factual directory summary is missing`);
      if (!game.sourceUrl) issues.push(`${prefix}: approved official source is missing`);
      if (!game.factCheckedAt) issues.push(`${prefix}: fact-check date is missing`);
      if (game.sourceUrl) { try { const domain = new URL(game.sourceUrl).hostname.toLowerCase().replace(/^www\./, ""); if (!approvedDomains.has(domain)) issues.push(`${prefix}: source domain is not approved`); } catch { issues.push(`${prefix}: source URL is invalid`); } }
      if (game.factCheckedAt && Date.now() - Date.parse(game.factCheckedAt) > 1000 * 60 * 60 * 24 * 30) issues.push(`${prefix}: fact check is older than 30 days`);
      if (gameSlugs.has(game.slug)) issues.push(`${prefix}: duplicate slug`); gameSlugs.add(game.slug);
      const normalizedSource = normalized(game.sourceUrl); if (!normalizedSource) issues.push(`${prefix}: normalized official source URL is missing or invalid`); else if (gameSourceUrls.has(normalizedSource)) issues.push(`${prefix}: duplicate normalized source URL also used by ${gameSourceUrls.get(normalizedSource)}`); else gameSourceUrls.set(normalizedSource, game.name);
      if (!game.published && game.reviewStatus !== "approved") issues.push(`${prefix}: Owner review decision is still required`);
      if (game.published && !timelineRows.some((event) => event.gameId === game.id && event.published)) issues.push(`${prefix}: no published game-history timeline coverage`);
    }
    const calendarFingerprints = new Map<string, string>();
    for (const item of await db.select().from(calendarItems)) {
      const prefix = `${item.title} (calendar ${item.published ? "published" : "review candidate"})`; const normalizedSource = normalized(item.sourceUrl);
      if (!normalizedSource) issues.push(`${prefix}: normalized official source URL is missing or invalid`);
      else { try { const domain = new URL(normalizedSource).hostname; if (!approvedDomains.has(domain)) issues.push(`${prefix}: source domain is not approved`); } catch { issues.push(`${prefix}: source URL is invalid`); } }
      if (!item.factCheckedAt) issues.push(`${prefix}: fact-check date is missing`); else if (Date.now() - Date.parse(item.factCheckedAt) > 1000 * 60 * 60 * 24 * 30) issues.push(`${prefix}: fact check is older than 30 days`);
      const fingerprint = calendarFingerprint(item.gameId, item.dateLabel, normalizedSource); if (calendarFingerprints.has(fingerprint)) issues.push(`${prefix}: duplicate calendar fingerprint also used by ${calendarFingerprints.get(fingerprint)}`); else calendarFingerprints.set(fingerprint, item.title);
      if (!item.published && item.reviewStatus !== "approved") issues.push(`${prefix}: Owner review decision is still required`);
    }
    technical.unshift(`${publishedGameSlugs.size} published game profile route${publishedGameSlugs.size === 1 ? "" : "s"} are eligible for sitemap output.`);
    for (const correction of await db.select().from(publicCorrections)) { if (correction.published && (!correction.sourceUrl || !correction.targetId || !["article","game"].includes(correction.targetType))) issues.push(`correction ${correction.id}: missing source or affected-page relationship`); }
    const media = await db.select().from(mediaAssets);
    const activeMedia = media.filter((asset) => asset.status !== "archived");
    for (const asset of activeMedia) {
      const target = asset.articleId || asset.gameId;
      const prefix = `media ${asset.id}`;
      if (!target || (asset.articleId && asset.gameId)) issues.push(`${prefix}: target record is missing or invalid`);
      if (!asset.altText.trim()) issues.push(`${prefix}: alt text is missing`);
      if (!asset.rightsNotes?.trim()) issues.push(`${prefix}: rights notes are missing`);
      if (!asset.width || !asset.height) issues.push(`${prefix}: image dimensions are missing`);
      if (asset.articleId && !["lead", "supporting"].includes(asset.placement)) issues.push(`${prefix}: invalid article placement`);
      if (asset.gameId && !["lead", "game-card", "directory-card"].includes(asset.placement)) issues.push(`${prefix}: invalid game placement`);
      if (asset.sourceType === "owner_upload" && !asset.r2Key) issues.push(`${prefix}: owner upload is missing its private R2 key`);
      if (asset.sourceType !== "owner_upload") { if (!asset.sourceUrl) issues.push(`${prefix}: approved media source is missing`); else { try { const domain = new URL(asset.sourceUrl).hostname.toLowerCase().replace(/^www\./, ""); if (!approvedDomains.has(domain)) issues.push(`${prefix}: media source domain is not approved`); } catch { issues.push(`${prefix}: media source URL is invalid`); } } }
    }
    for (const [target, assets] of Object.entries(activeMedia.reduce<Record<string, typeof activeMedia>>((all, asset) => { const key = asset.articleId || asset.gameId || asset.id; (all[key] ||= []).push(asset); return all; }, {}))) {
      if (assets.filter((asset) => asset.placement === "lead").length > 1) issues.push(`media target ${target}: more than one active lead visual`);
      if (assets.some((asset) => asset.articleId) && assets.filter((asset) => asset.placement === "supporting").length > 2) issues.push(`media target ${target}: more than two supporting article visuals`);
    }
    const approvedLeadTargets = new Set(activeMedia.filter((asset) => asset.status === "approved" && asset.placement === "lead" && asset.assetUrl?.startsWith("/media/") && asset.altText.trim() && asset.width && asset.height).map((asset) => asset.articleId ? `article:${asset.articleId}` : `game:${asset.gameId}`));
    for (const article of publishedArticles) visualCoverage.push(`${article.title}: ${approvedLeadTargets.has(`article:${article.id}`) ? "approved MyRPG-served lead visual is eligible for Open Graph" : "labelled MyRPG fallback is in use; no OG image is emitted until licensed media is approved"}`);
    for (const game of allGames.filter((candidate) => candidate.published)) visualCoverage.push(`${game.name}: ${approvedLeadTargets.has(`game:${game.id}`) ? "approved MyRPG-served lead visual is eligible for Open Graph" : "labelled MyRPG fallback is in use; no OG image is emitted until licensed media is approved"}`);
  } catch { issues.push("D1 records are not available yet."); }
  return <main style={{ padding: 48, fontFamily: "Arial", background: "#090b12", color: "#edf3f5", minHeight: "100vh" }}>
    <p>MYRPG / OWNER TECHNICAL SEO</p>
    <h1>{issues.length ? `${issues.length} items need attention` : "All records pass the lightweight checks"}</h1>
    <p>Read-only report. Checks prioritize crawl eligibility, source approval, fact-check freshness, duplicate slugs, published metadata prerequisites, and the factual fields that power Find My MMO, MMO Radar, and Official Updates.</p>
    <section style={{ margin: "24px 0", padding: 20, border: "1px solid #2a3041", background: "#121622" }}><h2>Technical SEO status</h2><ul>{technical.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section style={{ margin: "24px 0", padding: 20, border: "1px solid #2a3041", background: "#121622" }}><h2>Visual &amp; social metadata coverage</h2><p>Approved public visuals must use the MyRPG media route, include descriptive alt text and dimensions, and retain rights notes. Fallback graphics are labelled and intentionally omit Open Graph images.</p><ul>{visualCoverage.length ? visualCoverage.map((item) => <li key={item}>{item}</li>) : <li>No published article or game visual coverage is available yet.</li>}</ul></section>
    <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
    <a href="/admin">Return to Director Console</a>
  </main>;
}
